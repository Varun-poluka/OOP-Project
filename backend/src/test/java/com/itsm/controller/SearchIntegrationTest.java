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
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDateTime;
import java.util.List;

import static com.itsm.controller.ApiTestClient.ADMIN;
import static com.itsm.controller.ApiTestClient.DB_TECH;
import static com.itsm.controller.ApiTestClient.EMPLOYEE;
import static com.itsm.controller.ApiTestClient.marker;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// GET /api/incidents/search end to end. Every test puts a unique marker in its titles and searches
// for it, so incidents created by other tests in the shared database do not change the counts.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SearchIntegrationTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ITServiceRepository itServiceRepository;

    private ApiTestClient api;
    private String admin;
    private String employee;

    @BeforeEach
    void setUp() throws Exception {
        api = new ApiTestClient(mvc, itServiceRepository);
        admin = api.login(ADMIN);
        employee = api.login(EMPLOYEE);
    }

    // Runs a search as the admin with "text=<marker>" plus the extra query parameters.
    private ResultActions search(String marker, String... params) throws Exception {
        var request = get("/api/incidents/search").header("Authorization", admin).param("text", marker);
        for (int i = 0; i < params.length; i += 2) {
            request.param(params[i], params[i + 1]);
        }
        return mvc.perform(request);
    }

    @Test
    void textMatchesTitleOrDescriptionIgnoringCase() throws Exception {
        String m = marker();
        api.report(employee, m.toUpperCase() + " in title", "plain", "APPLICATION", "Email", "LOW", "LOW");
        api.report(employee, "plain title", "described by " + m, "APPLICATION", "Email", "LOW", "LOW");
        api.reportUnassigned(employee, "unrelated " + marker());

        search(m).andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void statusCategoryAndTechnicianFilters() throws Exception {
        String m = marker();
        String unassigned = api.reportUnassigned(employee, m + " app");
        String created = api.report(employee, m + " db", "integration test", "DATABASE", "Database Cluster",
                "MEDIUM", "MEDIUM");
        String dbId = JsonPath.read(created, "$.id");
        assertEquals("U-TEC-1", JsonPath.read(created, "$.assignedTechnicianId"));

        search(m, "status", "CLASSIFIED").andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(unassigned));
        search(m, "status", "ASSIGNED").andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(dbId));
        search(m, "categoryName", "DATABASE").andExpect(jsonPath("$.totalElements").value(1));
        search(m, "categoryName", "NETWORK").andExpect(jsonPath("$.totalElements").value(0));
        search(m, "technicianId", "U-TEC-1").andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(dbId));
        search(m, "technicianId", "U-TEC-2").andExpect(jsonPath("$.totalElements").value(0));

        api.resolveAs(api.login(DB_TECH), dbId); // frees the technician again
        search(m, "status", "RESOLVED").andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void priorityFilter() throws Exception {
        String m = marker();
        String high = api.report(employee, m + " high", "x", "APPLICATION", "Email", "HIGH", "HIGH");
        String low = api.report(employee, m + " low", "x", "APPLICATION", "Email", "LOW", "LOW");
        String highPriority = JsonPath.read(high, "$.priority");
        String lowPriority = JsonPath.read(low, "$.priority");
        assertNotEquals(highPriority, lowPriority);

        search(m, "priority", highPriority).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value((String) JsonPath.read(high, "$.id")));
        search(m, "priority", lowPriority).andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value((String) JsonPath.read(low, "$.id")));
    }

    @Test
    void reporterFilter() throws Exception {
        String m = marker();
        api.reportUnassigned(employee, m + " one");
        api.reportUnassigned(employee, m + " two");

        search(m, "reporterId", "U-EMP-1").andExpect(jsonPath("$.totalElements").value(2));
        search(m, "reporterId", "U-EMP-NOBODY").andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void fromIsIncludedAndToIsExcluded() throws Exception {
        String m = marker();
        LocalDateTime before = LocalDateTime.now().minusMinutes(1);
        api.reportUnassigned(employee, m);
        LocalDateTime after = LocalDateTime.now().plusMinutes(1);

        search(m, "from", before.toString(), "to", after.toString()).andExpect(jsonPath("$.totalElements").value(1));
        search(m, "from", after.toString()).andExpect(jsonPath("$.totalElements").value(0));
        search(m, "to", before.toString()).andExpect(jsonPath("$.totalElements").value(0));
        search(m, "from", after.toString(), "to", before.toString()).andExpect(status().isBadRequest());
    }

    @Test
    void breachedFilter() throws Exception {
        String m = marker();
        api.reportUnassigned(employee, m); // just reported, so no SLA clock has run out

        search(m, "breached", "false").andExpect(jsonPath("$.totalElements").value(1));
        search(m, "breached", "true").andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void pagingSplitsTheResults() throws Exception {
        String m = marker();
        for (int i = 0; i < 3; i++) {
            api.reportUnassigned(employee, m + " " + i);
        }

        search(m, "size", "1", "page", "0")
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(3))
                .andExpect(jsonPath("$.size").value(1));
        search(m, "size", "2", "page", "1")
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.page").value(1));
    }

    @Test
    void allowedSortFieldSortsAndOthersAreRejected() throws Exception {
        String m = marker();
        api.reportUnassigned(employee, m + " b");
        api.reportUnassigned(employee, m + " a");
        api.reportUnassigned(employee, m + " c");

        String body = search(m, "sort", "title,asc").andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<String> titles = JsonPath.read(body, "$.content[*].title");
        assertEquals(List.of(m + " a", m + " b", m + " c"), titles);

        search(m, "sort", "passwordHash").andExpect(status().isBadRequest());
        search(m, "sort", "reporter.email").andExpect(status().isBadRequest());
    }

    @Test
    void percentAndUnderscoreInTheTextMatchLiterally() throws Exception {
        String m = marker();
        api.reportUnassigned(employee, m + " disk 100% full");
        api.reportUnassigned(employee, m + " disk 1000 full");
        api.reportUnassigned(employee, m + " file_a");
        api.reportUnassigned(employee, m + " fileXa");

        // Unescaped, "100%" would mean "100 followed by anything" and also match "1000".
        search(m + " disk 100%").andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].title").value(m + " disk 100% full"));
        // Unescaped, "_" would match any single character, including the X.
        search(m + " file_a").andExpect(jsonPath("$.totalElements").value(1));
    }

    @Test
    void employeeOnlyFindsTheirOwnIncidents() throws Exception {
        String m = marker();
        api.reportUnassigned(employee, m);
        mvc.perform(get("/api/incidents/search").header("Authorization", employee).param("text", m)
                        .param("reporterId", "U-SOMEONE-ELSE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1)); // reporterId is replaced by their own id
    }
}
