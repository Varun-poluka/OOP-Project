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
import java.util.Map;
import java.util.Set;

import static com.itsm.controller.ApiTestClient.ADMIN;
import static com.itsm.controller.ApiTestClient.DB_TECH;
import static com.itsm.controller.ApiTestClient.EMPLOYEE;
import static com.itsm.controller.ApiTestClient.marker;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// GET /api/incidents/queue: a technician's own unfinished work, most urgent first.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TechnicianQueueIntegrationTest {

    private static final Set<String> WORKING = Set.of("ASSIGNED", "ACKNOWLEDGED", "IN_PROGRESS");

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ITServiceRepository itServiceRepository;

    @Test
    void onlyTechniciansHaveAQueue() throws Exception {
        ApiTestClient api = new ApiTestClient(mvc, itServiceRepository);
        mvc.perform(get("/api/incidents/queue").header("Authorization", api.login(EMPLOYEE)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/incidents/queue").header("Authorization", api.login(ADMIN)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/incidents/queue")).andExpect(status().isUnauthorized());
    }

    @Test
    void queueHoldsOwnUnfinishedWorkMostUrgentFirst() throws Exception {
        ApiTestClient api = new ApiTestClient(mvc, itServiceRepository);
        String employee = api.login(EMPLOYEE);
        String tech = api.login(DB_TECH);
        // DATABASE incidents are auto-assigned to the database technician (U-TEC-1).
        String created = api.report(employee, marker() + " db replica lag", "integration test", "DATABASE",
                "Database Cluster", "MEDIUM", "MEDIUM");
        String id = JsonPath.read(created, "$.id");
        assertEquals("U-TEC-1", JsonPath.read(created, "$.assignedTechnicianId"));

        List<Map<String, Object>> queue = queue(tech);
        assertTrue(ids(queue).contains(id));
        for (Map<String, Object> item : queue) {
            assertEquals("U-TEC-1", item.get("assignedTechnicianId"));
            assertTrue(WORKING.contains((String) item.get("status")));
        }
        assertMostUrgentFirst(queue);

        api.resolveAs(tech, id); // frees the technician's slot, and a resolved incident leaves the queue
        assertFalse(ids(queue(tech)).contains(id));
    }

    private List<Map<String, Object>> queue(String token) throws Exception {
        String body = mvc.perform(get("/api/incidents/queue").header("Authorization", token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$");
    }

    private static List<String> ids(List<Map<String, Object>> queue) {
        return queue.stream().map(item -> (String) item.get("id")).toList();
    }

    // Breached items come first; within each group slaPercentUsed never increases.
    private static void assertMostUrgentFirst(List<Map<String, Object>> queue) {
        for (int i = 1; i < queue.size(); i++) {
            boolean previousBreached = "BREACHED".equals(queue.get(i - 1).get("riskLevel"));
            boolean currentBreached = "BREACHED".equals(queue.get(i).get("riskLevel"));
            assertFalse(currentBreached && !previousBreached, "breached incident after a non-breached one");
            if (previousBreached == currentBreached) {
                assertTrue(percent(queue.get(i - 1)) >= percent(queue.get(i)), "queue not sorted by percent used");
            }
        }
    }

    private static int percent(Map<String, Object> item) {
        Object value = item.get("slaPercentUsed");
        return (value == null) ? 0 : ((Number) value).intValue();
    }
}
