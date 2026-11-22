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
import org.springframework.test.web.servlet.ResultActions;

import static com.itsm.controller.ApiTestClient.ADMIN;
import static com.itsm.controller.ApiTestClient.EMPLOYEE;
import static com.itsm.controller.ApiTestClient.PASSWORD;
import static com.itsm.controller.ApiTestClient.freshEmail;
import static com.itsm.controller.ApiTestClient.marker;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// /api/admin/users and PUT /api/admin/technicians/{id}.
// Technicians created here are deactivated straight away, so the assignment strategies never
// pick them for incidents other test classes report.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminUserIntegrationTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ITServiceRepository itServiceRepository;

    private ApiTestClient api() {
        return new ApiTestClient(mvc, itServiceRepository);
    }

    private ResultActions createUser(String token, String json) throws Exception {
        return mvc.perform(post("/api/admin/users").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private static String userJson(String name, String email, String role, String extra) {
        return "{\"name\":\"" + name + "\",\"email\":\"" + email + "\",\"password\":\"" + PASSWORD
                + "\",\"role\":\"" + role + "\"" + extra + "}";
    }

    // Returns the new technician's id; the account is already deactivated.
    private String createParkedTechnician(String admin) throws Exception {
        String body = createUser(admin, userJson("Temp Tech", freshEmail("tech"), "TECHNICIAN",
                ",\"maxWorkload\":4,\"skills\":[\"network\"]"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("TECHNICIAN"))
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.id");
        mvc.perform(patch("/api/admin/users/" + id + "/deactivate").header("Authorization", admin))
                .andExpect(status().isOk());
        return id;
    }

    @Test
    void onlyAdminsManageUsers() throws Exception {
        String employee = api().login(EMPLOYEE);
        mvc.perform(get("/api/admin/users").header("Authorization", employee)).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/users").header("Authorization", api().login("db.tech@itsm.local")))
                .andExpect(status().isForbidden());
        createUser(employee, userJson("X", freshEmail("x"), "ADMIN", "")).andExpect(status().isForbidden());
        mvc.perform(patch("/api/admin/users/U-EMP-1/deactivate").header("Authorization", employee))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/admin/technicians/U-TEC-1").header("Authorization", employee)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"skills\":[],\"available\":true,\"maxWorkload\":3}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void listShowsEveryUserWithRoleAndStatus() throws Exception {
        mvc.perform(get("/api/admin/users").header("Authorization", api().login(ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == 'U-ADM-1')].role", hasItem("ADMIN")))
                .andExpect(jsonPath("$[?(@.id == 'U-TEC-1')].role", hasItem("TECHNICIAN")))
                .andExpect(jsonPath("$[?(@.id == 'U-EMP-1')].active", hasItem(true)))
                .andExpect(jsonPath("$[0].passwordHash").doesNotExist());
    }

    @Test
    void adminCreatesEachRole() throws Exception {
        String admin = api().login(ADMIN);
        String adminEmail = freshEmail("admin");
        createUser(admin, userJson("Second Admin", adminEmail, "ADMIN", ""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("ADMIN"));
        createUser(admin, userJson("Staff Member", freshEmail("staff"), "EMPLOYEE", ""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("EMPLOYEE"));
        String techId = createParkedTechnician(admin);

        mvc.perform(get("/api/technicians").header("Authorization", admin))
                .andExpect(jsonPath("$[?(@.id == '" + techId + "')].skills[*]", hasItem("NETWORK")))
                .andExpect(jsonPath("$[?(@.id == '" + techId + "')].active", hasItem(false)));
        // The new admin can log in and use admin endpoints.
        mvc.perform(get("/api/admin/users").header("Authorization", api().login(adminEmail)))
                .andExpect(status().isOk());
    }

    @Test
    void invalidCreateRequestsAreRefused() throws Exception {
        String admin = api().login(ADMIN);
        createUser(admin, userJson("Dup", "employee@itsm.local", "EMPLOYEE", "")).andExpect(status().isConflict());
        createUser(admin, userJson("Boss", freshEmail("boss"), "SUPERUSER", ""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", containsString("role:")));
        createUser(admin, userJson("No Limit", freshEmail("nolimit"), "TECHNICIAN", ""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", containsString("maxWorkload is required")));
        createUser(admin, userJson("Bad Skill", freshEmail("badskill"), "TECHNICIAN",
                ",\"maxWorkload\":2,\"skills\":[\"ASTROLOGY\"]"))
                .andExpect(status().isNotFound());
    }

    @Test
    void deactivatedUserCannotLogInButTheirIncidentsRemain() throws Exception {
        String admin = api().login(ADMIN);
        String email = freshEmail("leaver");
        String body = createUser(admin, userJson("Leaving Soon", email, "EMPLOYEE", ""))
                .andReturn().getResponse().getContentAsString();
        String userId = JsonPath.read(body, "$.id");
        String incidentId = api().reportUnassigned(api().login(email), marker() + " leaver laptop");

        mvc.perform(patch("/api/admin/users/" + userId + "/deactivate").header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("This account has been deactivated. Contact your administrator."));
        // A wrong password still gets the generic message, so the deactivation is not revealed.
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid email or password"));
        mvc.perform(get("/api/incidents/" + incidentId).header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reporterName").value("Leaving Soon"));

        mvc.perform(patch("/api/admin/users/" + userId + "/deactivate").header("Authorization", admin))
                .andExpect(status().isConflict());
        mvc.perform(patch("/api/admin/users/" + userId + "/reactivate").header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(true));
        api().login(email); // expects 200
    }

    @Test
    void adminCannotDeactivateThemselves() throws Exception {
        mvc.perform(patch("/api/admin/users/U-ADM-1/deactivate").header("Authorization", api().login(ADMIN)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("You cannot deactivate your own account"));
    }

    @Test
    void technicianWithActiveWorkCannotBeDeactivated() throws Exception {
        ApiTestClient api = api();
        // NETWORK incidents go to the network technician (U-TEC-2).
        String created = api.report(api.login(EMPLOYEE), marker() + " switch down", "integration test",
                "NETWORK", "Email", "MEDIUM", "MEDIUM");
        String id = JsonPath.read(created, "$.id");

        mvc.perform(patch("/api/admin/users/U-TEC-2/deactivate").header("Authorization", api.login(ADMIN)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail", containsString("Reassign them first")));

        api.resolveAs(api.login("net.tech@itsm.local"), id);
    }

    @Test
    void adminEditsATechnician() throws Exception {
        String admin = api().login(ADMIN);
        String techId = createParkedTechnician(admin);
        String url = "/api/admin/technicians/" + techId;

        mvc.perform(put(url).header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"skills\":[\"HARDWARE\",\"database\"],\"available\":false,\"maxWorkload\":7}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.skills[0]").value("DATABASE"))
                .andExpect(jsonPath("$.skills[1]").value("HARDWARE"))
                .andExpect(jsonPath("$.available").value(false))
                .andExpect(jsonPath("$.maxWorkload").value(7));

        mvc.perform(put(url).header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"skills\":[],\"available\":true,\"maxWorkload\":0}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put(url).header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"skills\":[\"NOPE\"],\"available\":true,\"maxWorkload\":2}"))
                .andExpect(status().isNotFound());
        mvc.perform(put("/api/admin/technicians/U-EMP-1").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"skills\":[],\"available\":true,\"maxWorkload\":2}"))
                .andExpect(status().isNotFound());
    }
}
