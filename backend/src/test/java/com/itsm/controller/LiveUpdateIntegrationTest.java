package com.itsm.controller;

import com.itsm.repository.ITServiceRepository;
import com.itsm.service.live.LiveUpdateRegistry;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static com.itsm.controller.ApiTestClient.ADMIN;
import static com.itsm.controller.ApiTestClient.EMPLOYEE;
import static com.itsm.controller.ApiTestClient.marker;
import static org.hamcrest.Matchers.hasItem;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// The SSE stream and the small read endpoints, end to end.
// MockMvc keeps an SSE response open (asyncStarted) and collects what the server writes into it,
// so a test can open the stream, change an incident with a second request, then read the stream.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LiveUpdateIntegrationTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ITServiceRepository itServiceRepository;
    @Autowired
    private LiveUpdateRegistry registry;

    private ApiTestClient api;

    @BeforeEach
    void setUp() {
        api = new ApiTestClient(mvc, itServiceRepository);
    }

    private MvcResult openStream(String token) throws Exception {
        return mvc.perform(get("/api/stream").header("Authorization", token))
                .andExpect(request().asyncStarted())
                .andReturn();
    }

    // Ends the stream like a closed browser tab; the emitter's completion callback unregisters it.
    private static void close(MvcResult stream) {
        stream.getRequest().getAsyncContext().complete();
    }

    @Test
    void incidentChangeIsPushedToAConnectedAdmin() throws Exception {
        String admin = api.login(ADMIN);
        String employee = api.login(EMPLOYEE);
        MvcResult adminStream = openStream(admin);
        MvcResult employeeStream = openStream(employee);
        try {
            assertTrue(adminStream.getResponse().getContentAsString().contains("event:connected"));

            String id = api.reportUnassigned(employee, marker());

            String adminEvents = adminStream.getResponse().getContentAsString();
            assertTrue(adminEvents.contains("event:incident"), adminEvents);
            assertTrue(adminEvents.contains("\"incidentId\":\"" + id + "\""), adminEvents);
            assertTrue(adminEvents.contains("\"status\":\"CLASSIFIED\""), adminEvents);

            // The system classified the incident, so the reporter got a notification and its new count.
            String employeeEvents = employeeStream.getResponse().getContentAsString();
            assertTrue(employeeEvents.contains("event:incident"), employeeEvents);
            assertTrue(employeeEvents.contains("event:notification"), employeeEvents);
            assertTrue(employeeEvents.contains("\"unreadCount\":"), employeeEvents);
        } finally {
            close(adminStream);
            close(employeeStream);
        }
        assertFalse(registry.isConnected("U-ADM-1"));
        assertFalse(registry.isConnected("U-EMP-1"));
    }

    @Test
    void streamNeedsAToken() throws Exception {
        mvc.perform(get("/api/stream")).andExpect(status().isUnauthorized());
    }

    @Test
    void unreadCountIsANumberForTheCaller() throws Exception {
        mvc.perform(get("/api/notifications/unread-count").header("Authorization", api.login(EMPLOYEE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").isNumber());
    }

    @Test
    void categoriesAreListedForAnyLoggedInUser() throws Exception {
        mvc.perform(get("/api/categories").header("Authorization", api.login(EMPLOYEE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("APPLICATION")) // sorted by name
                .andExpect(jsonPath("$[*].name", hasItem("NETWORK")))
                .andExpect(jsonPath("$[0].description").isNotEmpty());
        mvc.perform(get("/api/categories")).andExpect(status().isUnauthorized());
    }

    @Test
    void techniciansAreAdminOnly() throws Exception {
        String body = mvc.perform(get("/api/technicians").header("Authorization", api.login(ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == 'U-TEC-2')].skills[*]", hasItem("HARDWARE")))
                .andExpect(jsonPath("$[?(@.id == 'U-TEC-1')].maxWorkload", hasItem(3)))
                .andReturn().getResponse().getContentAsString();
        assertTrue(JsonPath.<Object>read(body, "$[0].activeIncidents") instanceof Integer);
        assertTrue(JsonPath.<Object>read(body, "$[0].available") instanceof Boolean);

        mvc.perform(get("/api/technicians").header("Authorization", api.login(EMPLOYEE)))
                .andExpect(status().isForbidden());
    }
}
