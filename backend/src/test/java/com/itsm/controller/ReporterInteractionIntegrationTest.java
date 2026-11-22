package com.itsm.controller;

import com.itsm.repository.ITServiceRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static com.itsm.controller.ApiTestClient.ADMIN;
import static com.itsm.controller.ApiTestClient.EMPLOYEE;
import static com.itsm.controller.ApiTestClient.marker;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// The reporter's comments, the technician's information requests, feedback on verify,
// and GET /api/technicians/me.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReporterInteractionIntegrationTest {

    private static final String NET_TECH = "net.tech@itsm.local";

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ITServiceRepository itServiceRepository;

    private ResultActions postJson(String url, String token, String json) throws Exception {
        return mvc.perform(post(url).header("Authorization", token).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    @Test
    void reporterCommentIsStoredAndAudited() throws Exception {
        ApiTestClient api = new ApiTestClient(mvc, itServiceRepository);
        String id = api.reportUnassigned(api.login(EMPLOYEE), marker() + " comment printer");

        postJson("/api/incidents/" + id + "/comments", api.login(EMPLOYEE), "{\"text\":\"Also on floor 2\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notes[-1].text").value("Also on floor 2"))
                .andExpect(jsonPath("$.notes[-1].fromReporter").value(true))
                .andExpect(jsonPath("$.notes[-1].authorName").value("Asha Employee"))
                .andExpect(jsonPath("$.auditTrail[-1].action").value("COMMENT_ADDED"));
    }

    @Test
    void onlyTheReporterMayComment() throws Exception {
        ApiTestClient api = new ApiTestClient(mvc, itServiceRepository);
        String id = api.reportUnassigned(api.login(EMPLOYEE), marker() + " comment access");
        String url = "/api/incidents/" + id + "/comments";

        postJson(url, api.login(ADMIN), "{\"text\":\"admin note\"}").andExpect(status().isForbidden());
        postJson(url, api.login(NET_TECH), "{\"text\":\"tech note\"}").andExpect(status().isForbidden());
        postJson(url, api.login(EMPLOYEE), "{\"text\":\"  \"}").andExpect(status().isBadRequest());
    }

    @Test
    void infoRequestRoundTripWithFeedback() throws Exception {
        ApiTestClient api = new ApiTestClient(mvc, itServiceRepository);
        String employee = api.login(EMPLOYEE);
        String tech = api.login(NET_TECH);
        String created = api.report(employee, marker() + " wifi drops", "integration test", "NETWORK", "Email",
                "MEDIUM", "MEDIUM");
        String id = JsonPath.read(created, "$.id");
        String base = "/api/incidents/" + id;

        // Before acknowledging, the technician cannot ask yet.
        postJson(base + "/info-request", tech, "{\"question\":\"Which room?\"}").andExpect(status().isConflict());
        mvc.perform(patch(base + "/acknowledge").header("Authorization", tech)).andExpect(status().isOk());

        postJson(base + "/info-request", tech, "{\"question\":\"Which room?\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pendingInfoRequest").value("Which room?"))
                .andExpect(jsonPath("$.infoRequestedAt").isNotEmpty())
                .andExpect(jsonPath("$.auditTrail[-1].action").value("INFO_REQUESTED"));
        postJson(base + "/info-request", tech, "{\"question\":\"And which floor?\"}")
                .andExpect(status().isConflict());
        postJson(base + "/info-request", employee, "{\"question\":\"?\"}").andExpect(status().isForbidden());
        postJson(base + "/info-request", tech, "{\"question\":\"\"}").andExpect(status().isBadRequest());
        mvc.perform(get("/api/users/U-EMP-1/notifications").header("Authorization", employee))
                .andExpect(jsonPath("$[*].message", hasItem(containsString("needs more information: Which room?"))));

        postJson(base + "/comments", employee, "{\"text\":\"Room 204\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pendingInfoRequest").doesNotExist())
                .andExpect(jsonPath("$.auditTrail[-1].action").value("INFO_PROVIDED"));
        mvc.perform(get("/api/users/U-TEC-2/notifications").header("Authorization", tech))
                .andExpect(jsonPath("$[*].message", hasItem(containsString("answered your question: Room 204"))));

        mvc.perform(patch(base + "/start").header("Authorization", tech)).andExpect(status().isOk());
        mvc.perform(patch(base + "/resolve").header("Authorization", tech)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"resolutionDetails\":\"New access point\"}"))
                .andExpect(status().isOk());

        // Finished: no more comments.
        postJson(base + "/comments", employee, "{\"text\":\"thanks\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Cannot add a comment while the incident is RESOLVED"));

        mvc.perform(patch(base + "/verify").header("Authorization", employee)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":6}"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch(base + "/verify").header("Authorization", employee)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":5,\"comment\":\"Fast fix\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("VERIFIED"))
                .andExpect(jsonPath("$.feedbackRating").value(5))
                .andExpect(jsonPath("$.feedbackComment").value("Fast fix"))
                .andExpect(jsonPath("$.auditTrail[-1].action").value("FEEDBACK_GIVEN"));

        mvc.perform(get("/api/reports/summary").header("Authorization", api.login(ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.averageRating").isNumber())
                .andExpect(jsonPath("$.ratingCount").isNumber());
    }

    @Test
    void technicianSeesTheirOwnWorkload() throws Exception {
        ApiTestClient api = new ApiTestClient(mvc, itServiceRepository);
        mvc.perform(get("/api/technicians/me").header("Authorization", api.login(NET_TECH)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("U-TEC-2"))
                .andExpect(jsonPath("$.maxWorkload").value(3))
                .andExpect(jsonPath("$.activeIncidents").isNumber());
        mvc.perform(get("/api/technicians/me").header("Authorization", api.login(EMPLOYEE)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/technicians/me").header("Authorization", api.login(ADMIN)))
                .andExpect(status().isForbidden());
    }
}
