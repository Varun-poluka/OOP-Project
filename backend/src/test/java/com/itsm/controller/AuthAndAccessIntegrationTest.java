package com.itsm.controller;

import com.itsm.domain.Employee;
import com.itsm.domain.ITService;
import com.itsm.repository.ITServiceRepository;
import com.itsm.repository.UserRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Runs the whole app (security filters, controllers, services, JPA) against the itsm_test database.
// MockMvc sends simulated HTTP requests without starting a real server.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthAndAccessIntegrationTest {

    private static final String PASSWORD = "password123";
    private static final String EMPLOYEE = "employee@itsm.local";
    private static final String OTHER_EMPLOYEE = "other.employee@itsm.local";
    private static final String ADMIN = "admin@itsm.local";
    private static final Map<String, String> TECH_EMAIL = Map.of(
            "U-TEC-1", "db.tech@itsm.local",
            "U-TEC-2", "net.tech@itsm.local");

    @Autowired
    private MockMvc mvc;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ITServiceRepository itServiceRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void addSecondEmployee() {
        if (!userRepository.existsById("U-EMP-2")) {
            userRepository.save(new Employee("U-EMP-2", "Other Employee", OTHER_EMPLOYEE,
                    passwordEncoder.encode(PASSWORD)));
        }
    }

    // ----- helpers -----

    private String login(String email) throws Exception {
        String body = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + JsonPath.read(body, "$.token");
    }

    private long serviceId(String name) {
        for (ITService service : itServiceRepository.findAll()) {
            if (service.getName().equals(name)) {
                return service.getId();
            }
        }
        throw new IllegalStateException("No seeded service " + name);
    }

    // Returns the created incident's JSON.
    private String report(String token, String category, String service) throws Exception {
        String json = "{\"title\":\"Test " + category + "\",\"description\":\"integration test\","
                + "\"categoryName\":\"" + category + "\",\"serviceId\":" + serviceId(service)
                + ",\"impact\":\"MEDIUM\",\"urgency\":\"MEDIUM\"}";
        return mvc.perform(post("/api/incidents").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
    }

    // ----- tests -----

    @Test
    void loginWithCorrectPasswordReturnsTokenAndUser() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + ADMIN + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.expiresAt").isNotEmpty())
                .andExpect(jsonPath("$.user.id").value("U-ADM-1"))
                .andExpect(jsonPath("$.user.role").value("ADMIN"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist());
    }

    @Test
    void wrongPasswordAndUnknownEmailGiveTheSame401() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + ADMIN + "\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("Invalid email or password"));
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nobody@itsm.local\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid email or password"));
    }

    @Test
    void noTokenGives401ProblemDetail() throws Exception {
        mvc.perform(get("/api/incidents"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    void invalidTokenGives401() throws Exception {
        mvc.perform(get("/api/incidents").header("Authorization", "Bearer not.a.real.token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void employeeOnAdminEndpointGets403() throws Exception {
        mvc.perform(get("/api/reports/summary").header("Authorization", login(EMPLOYEE)))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    void employeeCannotSeeAnotherEmployeesIncident() throws Exception {
        String created = report(login(EMPLOYEE), "APPLICATION", "Email");
        String id = JsonPath.read(created, "$.id");
        String other = login(OTHER_EMPLOYEE);

        mvc.perform(get("/api/incidents/" + id).header("Authorization", other))
                .andExpect(status().isForbidden());
        // Search ignores the reporterId they send and only returns their own incidents.
        mvc.perform(get("/api/incidents/search?reporterId=U-EMP-1").header("Authorization", other))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
        // A technician can see it.
        mvc.perform(get("/api/incidents/" + id).header("Authorization", login("db.tech@itsm.local")))
                .andExpect(status().isOk());
    }

    @Test
    void technicianWhoIsNotAssignedCannotResolve() throws Exception {
        String created = report(login(EMPLOYEE), "DATABASE", "Database Cluster");
        String id = JsonPath.read(created, "$.id");
        String assignedId = JsonPath.read(created, "$.assignedTechnicianId");
        String assigned = login(TECH_EMAIL.get(assignedId));
        String otherTechId = assignedId.equals("U-TEC-1") ? "U-TEC-2" : "U-TEC-1";

        mvc.perform(patch("/api/incidents/" + id + "/acknowledge").header("Authorization", assigned))
                .andExpect(status().isOk());
        mvc.perform(patch("/api/incidents/" + id + "/start").header("Authorization", assigned))
                .andExpect(status().isOk());
        mvc.perform(patch("/api/incidents/" + id + "/resolve").header("Authorization", login(TECH_EMAIL.get(otherTechId)))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"resolutionDetails\":\"not mine\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void manualAssignIsAuditedAsTheAdmin() throws Exception {
        // No technician has the APPLICATION skill, so the incident stays CLASSIFIED.
        String created = report(login(EMPLOYEE), "APPLICATION", "Email");
        String id = JsonPath.read(created, "$.id");

        mvc.perform(patch("/api/incidents/" + id + "/assign").header("Authorization", login(ADMIN))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"technicianId\":\"U-TEC-2\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ASSIGNED"))
                .andExpect(jsonPath("$.auditTrail[-1].action").value("ASSIGNED"))
                .andExpect(jsonPath("$.auditTrail[-1].actorName").value("Ravi Admin"));
    }

    @Test
    void fullHappyPathWithTheRightLogins() throws Exception {
        String employee = login(EMPLOYEE);
        String created = report(employee, "NETWORK", "Email");
        String id = JsonPath.read(created, "$.id");
        String tech = login(TECH_EMAIL.get(JsonPath.read(created, "$.assignedTechnicianId")));
        String base = "/api/incidents/" + id;

        mvc.perform(patch(base + "/acknowledge").header("Authorization", tech))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACKNOWLEDGED"));
        mvc.perform(patch(base + "/start").header("Authorization", tech))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("IN_PROGRESS"));
        mvc.perform(patch(base + "/resolve").header("Authorization", tech)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"resolutionDetails\":\"Restarted the router\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("RESOLVED"));
        mvc.perform(patch(base + "/verify").header("Authorization", employee))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("VERIFIED"));
        mvc.perform(patch(base + "/close").header("Authorization", employee))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CLOSED"));
    }
}
