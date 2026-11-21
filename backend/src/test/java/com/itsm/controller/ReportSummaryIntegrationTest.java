package com.itsm.controller;

import com.itsm.repository.ITServiceRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static com.itsm.controller.ApiTestClient.ADMIN;
import static com.itsm.controller.ApiTestClient.EMPLOYEE;
import static com.itsm.controller.ApiTestClient.marker;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// GET /api/reports/summary end to end.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReportSummaryIntegrationTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ITServiceRepository itServiceRepository;

    private ApiTestClient api;
    private String admin;

    @BeforeEach
    void setUp() throws Exception {
        api = new ApiTestClient(mvc, itServiceRepository);
        admin = api.login(ADMIN);
    }

    private static long sum(List<Integer> counts) {
        long total = 0;
        for (Integer count : counts) {
            total += count;
        }
        return total;
    }

    @Test
    void groupedCountsAddUpToTheTotal() throws Exception {
        api.reportUnassigned(api.login(EMPLOYEE), marker()); // at least one incident in the range

        String body = mvc.perform(get("/api/reports/summary").header("Authorization", admin))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        int total = JsonPath.read(body, "$.totalIncidents");
        assertTrue(total >= 1);
        assertEquals(total, sum(JsonPath.read(body, "$.byStatus[*].count")));
        assertEquals(total, sum(JsonPath.read(body, "$.byPriority[*].count")));
        assertEquals(total, sum(JsonPath.read(body, "$.byCategory[*].count")));
        assertEquals(total, (int) JsonPath.read(body, "$.overall.incidents"));
        // Each incident has at most one priority, so the per-priority SLA counts cannot exceed the total.
        assertTrue(sum(JsonPath.read(body, "$.byPriorityPerformance.*.incidents")) <= total);
    }

    @Test
    void emptyRangeGivesZeroCountsAndNullFigures() throws Exception {
        mvc.perform(get("/api/reports/summary").header("Authorization", admin)
                        .param("from", LocalDateTime.of(2000, 1, 1, 0, 0).toString())
                        .param("to", LocalDateTime.of(2000, 2, 1, 0, 0).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncidents").value(0))
                .andExpect(jsonPath("$.byStatus").isEmpty())
                .andExpect(jsonPath("$.overall.incidents").value(0))
                .andExpect(jsonPath("$.overall.responseCompliance").value(nullValue()))
                .andExpect(jsonPath("$.overall.resolutionCompliance").value(nullValue()))
                .andExpect(jsonPath("$.overall.meanMinutesToAcknowledge").value(nullValue()))
                .andExpect(jsonPath("$.overall.meanMinutesToResolve").value(nullValue()))
                .andExpect(jsonPath("$.technicians").isNotEmpty()); // technicians are listed with zeros
    }

    // The backlog is "open now": the same with a range in the year 2000 as with the default range.
    @Test
    void openCountsIgnoreTheDateRange() throws Exception {
        String id = api.reportUnassigned(api.login(EMPLOYEE), marker()); // stays CLASSIFIED, so it is open
        String incident = mvc.perform(get("/api/incidents/" + id).header("Authorization", admin))
                .andReturn().getResponse().getContentAsString();
        String priority = JsonPath.read(incident, "$.priority");

        String oldRange = mvc.perform(get("/api/reports/summary").header("Authorization", admin)
                        .param("from", LocalDateTime.of(2000, 1, 1, 0, 0).toString())
                        .param("to", LocalDateTime.of(2000, 2, 1, 0, 0).toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalIncidents").value(0))
                .andExpect(jsonPath("$.openByPriority.P1").exists())
                .andExpect(jsonPath("$.openByPriority.P2").exists())
                .andExpect(jsonPath("$.openByPriority.P3").exists())
                .andExpect(jsonPath("$.openByPriority.P4").exists())
                .andReturn().getResponse().getContentAsString();
        String defaultRange = mvc.perform(get("/api/reports/summary").header("Authorization", admin))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        int open = JsonPath.read(oldRange, "$.openIncidents");
        assertTrue(open >= 1);
        assertTrue((int) JsonPath.read(oldRange, "$.openByPriority." + priority) >= 1);
        // NEW incidents have no priority, so the four keys add up to at most openIncidents.
        assertTrue(sum(JsonPath.read(oldRange, "$.openByPriority.*")) <= open);
        assertEquals(open, (int) JsonPath.read(defaultRange, "$.openIncidents"));
        assertEquals((Object) JsonPath.read(oldRange, "$.openByPriority"), JsonPath.read(defaultRange, "$.openByPriority"));
    }

    @Test
    void fromMustBeBeforeTo() throws Exception {
        mvc.perform(get("/api/reports/summary").header("Authorization", admin)
                        .param("from", "2026-02-01T00:00:00")
                        .param("to", "2026-01-01T00:00:00"))
                .andExpect(status().isBadRequest());
    }
}
