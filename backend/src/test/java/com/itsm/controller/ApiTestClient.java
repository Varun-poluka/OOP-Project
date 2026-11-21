package com.itsm.controller;

import com.itsm.repository.ITServiceRepository;
import com.jayway.jsonpath.JsonPath;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Shared helpers for the slice 4 integration tests: log in, report, and walk an incident forward.
// Every test class shares one test database and two technicians with a workload of 3, so tests
// report APPLICATION incidents (no technician has that skill, so they stay unassigned) and
// resolve any incident that did get a technician, leaving the workload as they found it.
final class ApiTestClient {

    static final String PASSWORD = "password123";
    static final String EMPLOYEE = "employee@itsm.local";
    static final String ADMIN = "admin@itsm.local";
    static final String DB_TECH = "db.tech@itsm.local";

    private final MockMvc mvc;
    private final ITServiceRepository itServiceRepository;

    ApiTestClient(MockMvc mvc, ITServiceRepository itServiceRepository) {
        this.mvc = mvc;
        this.itServiceRepository = itServiceRepository;
    }

    // A unique lowercase word, so a test can find exactly the incidents it created.
    static String marker() {
        return "m" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    String login(String email) throws Exception {
        String body = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + JsonPath.read(body, "$.token");
    }

    long serviceId(String name) {
        return itServiceRepository.findByName(name)
                .orElseThrow(() -> new IllegalStateException("No seeded service " + name))
                .getId();
    }

    // Returns the created incident's JSON.
    String report(String token, String title, String description, String category, String service,
                  String impact, String urgency) throws Exception {
        String json = "{\"title\":\"" + title + "\",\"description\":\"" + description + "\","
                + "\"categoryName\":\"" + category + "\",\"serviceId\":" + serviceId(service)
                + ",\"impact\":\"" + impact + "\",\"urgency\":\"" + urgency + "\"}";
        return mvc.perform(post("/api/incidents").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
    }

    // An unassigned (CLASSIFIED) incident; returns its id.
    String reportUnassigned(String token, String title) throws Exception {
        return JsonPath.read(report(token, title, "integration test", "APPLICATION", "Email", "MEDIUM", "MEDIUM"), "$.id");
    }

    // Takes an ASSIGNED incident to RESOLVED as its technician, which frees the technician's slot.
    void resolveAs(String techToken, String id) throws Exception {
        String base = "/api/incidents/" + id;
        mvc.perform(patch(base + "/acknowledge").header("Authorization", techToken)).andExpect(status().isOk());
        mvc.perform(patch(base + "/start").header("Authorization", techToken)).andExpect(status().isOk());
        mvc.perform(patch(base + "/resolve").header("Authorization", techToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"resolutionDetails\":\"fixed in test\"}"))
                .andExpect(status().isOk());
    }
}
