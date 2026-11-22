package com.itsm.controller;

import com.itsm.repository.ITServiceRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static com.itsm.controller.ApiTestClient.ADMIN;
import static com.itsm.controller.ApiTestClient.EMPLOYEE;
import static com.itsm.controller.ApiTestClient.marker;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// GET /api/admin/audit: every incident's audit records, filtered and paged, newest first.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuditLogIntegrationTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ITServiceRepository itServiceRepository;

    @Test
    void filtersByIncidentAndListsNewestFirst() throws Exception {
        ApiTestClient api = new ApiTestClient(mvc, itServiceRepository);
        String id = api.reportUnassigned(api.login(EMPLOYEE), marker() + " audit printer");
        String admin = api.login(ADMIN);

        String body = mvc.perform(get("/api/admin/audit?incidentId=" + id.toLowerCase()).header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2)) // CREATED, CLASSIFIED
                .andExpect(jsonPath("$.content[0].incidentId").value(id))
                .andExpect(jsonPath("$.content[0].action").value("CLASSIFIED"))
                .andExpect(jsonPath("$.content[0].actorName").value("SYSTEM"))
                .andExpect(jsonPath("$.content[1].action").value("CREATED"))
                .andExpect(jsonPath("$.content[1].actorId").value("U-EMP-1"))
                .andReturn().getResponse().getContentAsString();
        List<String> times = JsonPath.read(body, "$.content[*].timestamp");
        assertTrue(times.get(0).compareTo(times.get(1)) >= 0);
    }

    @Test
    void filtersByUserActionAndDate() throws Exception {
        ApiTestClient api = new ApiTestClient(mvc, itServiceRepository);
        String id = api.reportUnassigned(api.login(EMPLOYEE), marker() + " audit filters");
        String admin = api.login(ADMIN);
        String base = "/api/admin/audit?incidentId=" + id;

        mvc.perform(get(base + "&actorId=U-EMP-1").header("Authorization", admin))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].action").value("CREATED"));
        mvc.perform(get(base + "&actorId=SYSTEM").header("Authorization", admin))
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].action").value("CLASSIFIED"));
        mvc.perform(get(base + "&action=created").header("Authorization", admin))
                .andExpect(jsonPath("$.totalElements").value(1));
        mvc.perform(get(base + "&from=2000-01-01T00:00:00&to=2000-01-02T00:00:00").header("Authorization", admin))
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void pagesAreLimited() throws Exception {
        String admin = new ApiTestClient(mvc, itServiceRepository).login(ADMIN);
        String body = mvc.perform(get("/api/admin/audit?size=1&page=0").header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(1))
                .andReturn().getResponse().getContentAsString();
        assertEquals(1, JsonPath.<List<Object>>read(body, "$.content").size());

        mvc.perform(get("/api/admin/audit?size=500").header("Authorization", admin)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/audit?page=-1").header("Authorization", admin)).andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/audit?from=2026-02-01T00:00:00&to=2026-01-01T00:00:00").header("Authorization", admin))
                .andExpect(status().isBadRequest());
    }

    @Test
    void onlyAdminsReadTheAuditLog() throws Exception {
        ApiTestClient api = new ApiTestClient(mvc, itServiceRepository);
        mvc.perform(get("/api/admin/audit").header("Authorization", api.login(EMPLOYEE))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/audit").header("Authorization", api.login("db.tech@itsm.local")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/audit")).andExpect(status().isUnauthorized());
    }
}
