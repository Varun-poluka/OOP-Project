package com.itsm.controller;

import com.itsm.repository.ITServiceRepository;
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
import static com.itsm.controller.ApiTestClient.marker;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// POST /api/admin/categories. Names start with ZT_ so they sort after the seeded categories
// (another test expects APPLICATION to come first).
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CategoryAdminIntegrationTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private ITServiceRepository itServiceRepository;

    private ResultActions create(String token, String json) throws Exception {
        return mvc.perform(post("/api/admin/categories").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    @Test
    void newCategoryIsListedAndUsableAtOnce() throws Exception {
        ApiTestClient api = new ApiTestClient(mvc, itServiceRepository);
        String name = "zt_" + marker();
        create(api.login(ADMIN), "{\"name\":\"" + name + "\",\"description\":\"Printers and scanners\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value(name.toUpperCase()))
                .andExpect(jsonPath("$.description").value("Printers and scanners"));

        String employee = api.login(EMPLOYEE);
        mvc.perform(get("/api/categories").header("Authorization", employee))
                .andExpect(jsonPath("$[*].name", hasItem(name.toUpperCase())));
        // No technician has this skill yet, so the incident stays unassigned (CLASSIFIED).
        api.report(employee, "Scanner offline", "integration test", name.toUpperCase(), "Email", "LOW", "LOW");
    }

    @Test
    void duplicateNameIsAConflictWhateverTheCase() throws Exception {
        String admin = new ApiTestClient(mvc, itServiceRepository).login(ADMIN);
        String name = "ZT_" + marker();
        create(admin, "{\"name\":\"" + name + "\"}").andExpect(status().isCreated());
        create(admin, "{\"name\":\"" + name.toLowerCase() + "\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail", containsString("already exists")));
        create(admin, "{\"name\":\"network\"}").andExpect(status().isConflict());
    }

    @Test
    void invalidNamesAreA400() throws Exception {
        String admin = new ApiTestClient(mvc, itServiceRepository).login(ADMIN);
        create(admin, "{\"name\":\"\"}").andExpect(status().isBadRequest());
        create(admin, "{\"name\":\"two words!\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail", containsString("may only contain letters, digits and _")));
    }

    @Test
    void onlyAdminsAddCategories() throws Exception {
        ApiTestClient api = new ApiTestClient(mvc, itServiceRepository);
        create(api.login(EMPLOYEE), "{\"name\":\"ZT_NOPE\"}").andExpect(status().isForbidden());
        create(api.login("db.tech@itsm.local"), "{\"name\":\"ZT_NOPE\"}").andExpect(status().isForbidden());
    }
}
