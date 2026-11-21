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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Every notification must name its incident, so the frontend can link to it.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NotificationIntegrationTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ITServiceRepository itServiceRepository;

    @Test
    void notificationsCarryTheirIncidentId() throws Exception {
        ApiTestClient api = new ApiTestClient(mvc, itServiceRepository);
        String employee = api.login(EMPLOYEE);
        String title = marker() + " mail client keeps crashing";
        // The system classifies it (actor SYSTEM), so the reporter gets a CLASSIFIED notification.
        String id = api.reportUnassigned(employee, title);

        String body = mvc.perform(get("/api/users/U-EMP-1/notifications").header("Authorization", employee))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        List<String> incidentIds = JsonPath.read(body, "$[?(@.message =~ /.*" + title.split(" ")[0] + ".*/)].incidentId");
        assertFalse(incidentIds.isEmpty());
        for (String incidentId : incidentIds) {
            assertEquals(id, incidentId);
        }
    }

    // Guard for NotificationMessageFormatter: the PRIORITY_RAISED and SERVICE_IMPACT descriptions are
    // written by IncidentService.report. Network has more than 3 dependents in the seeded graph, so
    // the admin is told about both, in readable form with at most 3 service names.
    @Test
    void adminsGetReadablePriorityAndImpactMessages() throws Exception {
        ApiTestClient api = new ApiTestClient(mvc, itServiceRepository);
        String marker = marker();
        // APPLICATION: no test technician has that skill, so it stays unassigned (no workload to undo).
        api.report(api.login(EMPLOYEE), marker + " campus network unreachable", "integration test",
                "APPLICATION", "Network", "LOW", "MEDIUM");

        String admin = api.login(ADMIN);
        String body = mvc.perform(get("/api/users/U-ADM-1/notifications").header("Authorization", admin))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<String> messages = JsonPath.read(body, "$[?(@.message =~ /.*" + marker + ".*/)].message");

        assertTrue(messages.stream().anyMatch(m -> m.contains("): Priority raised from P")), messages.toString());
        assertTrue(messages.stream().anyMatch(m -> m.matches(".*\\): Service impact: an outage of Network may affect "
                + "[^,]+, [^,]+, [^,]+ and \\d+ more")), messages.toString());
    }
}
