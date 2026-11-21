package com.itsm.controller;

import com.itsm.domain.ITService;
import com.itsm.repository.ITServiceRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Role rules and end-to-end behaviour of the slice 3 endpoints, against the itsm_test database.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class IntelligenceIntegrationTest {

    private static final String PASSWORD = "password123";
    private static final String EMPLOYEE = "employee@itsm.local";
    private static final String ADMIN = "admin@itsm.local";
    private static final String TECH = "net.tech@itsm.local";

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ITServiceRepository itServiceRepository;

    private String login(String email) throws Exception {
        String body = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + JsonPath.read(body, "$.token");
    }

    private long serviceId(String name) {
        ITService service = itServiceRepository.findByName(name)
                .orElseThrow(() -> new IllegalStateException("No seeded service " + name));
        return service.getId();
    }

    private String report(String token, String title, String category, String service) throws Exception {
        String json = "{\"title\":\"" + title + "\",\"description\":\"integration test\","
                + "\"categoryName\":\"" + category + "\",\"serviceId\":" + serviceId(service)
                + ",\"impact\":\"LOW\",\"urgency\":\"LOW\"}";
        return mvc.perform(post("/api/incidents").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
    }

    @Test
    void employeeSeesOnlyIdTitleAndStatusOfDuplicates() throws Exception {
        String employee = login(EMPLOYEE);
        String id = JsonPath.read(report(employee, "Projector flickering lecture hall", "HARDWARE", "LMS"), "$.id");
        String check = "{\"title\":\"Projector flickering in lecture hall\",\"description\":\"integration test\","
                + "\"categoryName\":\"HARDWARE\",\"affectedServiceId\":" + serviceId("LMS") + "}";

        mvc.perform(post("/api/incidents/duplicates/check").header("Authorization", employee)
                        .contentType(MediaType.APPLICATION_JSON).content(check))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].incidentId").value(id))
                .andExpect(jsonPath("$[0].title").exists())
                .andExpect(jsonPath("$[0].status").exists())
                .andExpect(jsonPath("$[0].score").doesNotExist())
                .andExpect(jsonPath("$[0].reasons").doesNotExist());

        mvc.perform(post("/api/incidents/duplicates/check").header("Authorization", login(ADMIN))
                        .contentType(MediaType.APPLICATION_JSON).content(check))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].score").isNumber())
                .andExpect(jsonPath("$[0].reasons").isArray());

        mvc.perform(post("/api/incidents/duplicates/check").header("Authorization", login(TECH))
                        .contentType(MediaType.APPLICATION_JSON).content(check))
                .andExpect(status().isForbidden());
    }

    @Test
    void createResponseListsPossibleDuplicates() throws Exception {
        String employee = login(EMPLOYEE);
        String first = JsonPath.read(report(employee, "Wifi drops in library annex", "NETWORK", "LMS"), "$.id");
        mvc.perform(post("/api/incidents").header("Authorization", employee)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Wifi drops in library annex\",\"description\":\"integration test\","
                                + "\"categoryName\":\"NETWORK\",\"serviceId\":" + serviceId("LMS")
                                + ",\"impact\":\"LOW\",\"urgency\":\"LOW\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.possibleDuplicates[*].incidentId", hasItem(first)));
    }

    @Test
    void recommendationsAreAdminOnly() throws Exception {
        String id = JsonPath.read(report(login(EMPLOYEE), "Switch port dead", "NETWORK", "LMS"), "$.id");
        mvc.perform(get("/api/incidents/" + id + "/recommendations").header("Authorization", login(EMPLOYEE)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/incidents/" + id + "/recommendations").header("Authorization", login(TECH)))
                .andExpect(status().isForbidden());
        // Only two technicians are seeded, so the top 3 holds two entries; the network expert comes first.
        mvc.perform(get("/api/incidents/" + id + "/recommendations").header("Authorization", login(ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].technicianId").value("U-TEC-2"))
                .andExpect(jsonPath("$[0].reasons").isArray());
    }

    @Test
    void atRiskIsForTechniciansAndAdmins() throws Exception {
        mvc.perform(get("/api/incidents/at-risk").header("Authorization", login(EMPLOYEE)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/incidents/at-risk").header("Authorization", login(TECH)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/incidents/at-risk").header("Authorization", login(ADMIN)))
                .andExpect(status().isOk());
    }

    @Test
    void serviceCatalogueRoles() throws Exception {
        String employee = login(EMPLOYEE);
        String admin = login(ADMIN);
        mvc.perform(get("/api/services").header("Authorization", employee))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name", hasItem("Network")));
        mvc.perform(get("/api/services/" + serviceId("Network") + "/impact").header("Authorization", employee))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/services").header("Authorization", employee)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Wiki\",\"businessCriticality\":1}"))
                .andExpect(status().isForbidden());

        String created = mvc.perform(post("/api/services").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Wiki\",\"businessCriticality\":1}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Integer wikiId = JsonPath.read(created, "$.id");
        String edge = "/api/services/" + wikiId + "/dependencies/" + serviceId("SSO");

        mvc.perform(post(edge).header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dependsOn[0].name").value("SSO"));
        mvc.perform(get("/api/services/" + serviceId("SSO") + "/impact").header("Authorization", login(TECH)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.impacted[*].name", hasItem("Wiki")));
        mvc.perform(delete(edge).header("Authorization", employee))
                .andExpect(status().isForbidden());
        mvc.perform(delete(edge).header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dependsOn").isEmpty());
    }

    @Test
    void networkIncidentRaisesPriorityAndRecordsWhy() throws Exception {
        String created = report(login(EMPLOYEE), "Campus network outage", "NETWORK", "Network");
        String id = JsonPath.read(created, "$.id");
        mvc.perform(get("/api/incidents/" + id).header("Authorization", login(ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.auditTrail[*].action", hasItem("PRIORITY_RAISED")))
                .andExpect(jsonPath("$.auditTrail[*].action", hasItem("SERVICE_IMPACT")));
        mvc.perform(get("/api/incidents/" + id + "/impact").header("Authorization", login(EMPLOYEE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.impactedCount").value(7));
    }
}
