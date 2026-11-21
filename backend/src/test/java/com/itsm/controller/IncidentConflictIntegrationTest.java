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

import static com.itsm.controller.ApiTestClient.DB_TECH;
import static com.itsm.controller.ApiTestClient.EMPLOYEE;
import static com.itsm.controller.ApiTestClient.marker;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// A refused lifecycle action is a 409 Conflict (InvalidStateTransitionException), not a server error.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class IncidentConflictIntegrationTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ITServiceRepository itServiceRepository;

    @Test
    void addingANoteToAClosedIncidentIs409() throws Exception {
        ApiTestClient api = new ApiTestClient(mvc, itServiceRepository);
        String employee = api.login(EMPLOYEE);
        String tech = api.login(DB_TECH);
        String created = api.report(employee, marker() + " db slow", "integration test", "DATABASE",
                "Database Cluster", "MEDIUM", "MEDIUM");
        String id = JsonPath.read(created, "$.id");
        String base = "/api/incidents/" + id;

        api.resolveAs(tech, id);
        mvc.perform(patch(base + "/verify").header("Authorization", employee)).andExpect(status().isOk());
        mvc.perform(patch(base + "/close").header("Authorization", employee))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CLOSED"));

        mvc.perform(post(base + "/notes").header("Authorization", tech)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"one more thing\"}"))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Cannot move incident from CLOSED to CLOSED"));
    }
}
