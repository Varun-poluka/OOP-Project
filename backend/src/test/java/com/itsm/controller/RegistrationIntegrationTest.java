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

import static com.itsm.controller.ApiTestClient.PASSWORD;
import static com.itsm.controller.ApiTestClient.freshEmail;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// POST /api/auth/register: public self-registration, always as an employee.
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RegistrationIntegrationTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ITServiceRepository itServiceRepository;

    private ResultActions register(String json) throws Exception {
        return mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private static String body(String name, String email, String password) {
        return "{\"name\":\"" + name + "\",\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
    }

    @Test
    void newEmployeeCanRegisterAndThenLogIn() throws Exception {
        String email = freshEmail("new");
        register(body("New Starter", email, PASSWORD))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", startsWith("U-EMP-")))
                .andExpect(jsonPath("$.role").value("EMPLOYEE"))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        String token = new ApiTestClient(mvc, itServiceRepository).login(email);
        mvc.perform(get("/api/auth/me").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("New Starter"));
    }

    @Test
    void aRoleInTheBodyIsIgnored() throws Exception {
        String json = "{\"name\":\"Sneaky\",\"email\":\"" + freshEmail("sneaky") + "\",\"password\":\"" + PASSWORD
                + "\",\"role\":\"ADMIN\"}";
        register(json).andExpect(status().isCreated()).andExpect(jsonPath("$.role").value("EMPLOYEE"));
    }

    @Test
    void duplicateEmailIsAConflictWhateverTheCase() throws Exception {
        String email = freshEmail("twice");
        register(body("First", email, PASSWORD)).andExpect(status().isCreated());
        register(body("Second", email.toUpperCase(), PASSWORD))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail", containsString("already exists")));
        // Also for an email that was seeded, not registered.
        register(body("Asha again", "employee@itsm.local", PASSWORD)).andExpect(status().isConflict());
    }

    @Test
    void invalidFieldsAreA400NamingEachField() throws Exception {
        register(body("", "not-an-email", "short"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", containsString("name:")))
                .andExpect(jsonPath("$.detail", containsString("email:")))
                .andExpect(jsonPath("$.detail", containsString("password: must be 8 to 100 characters")));
    }
}
