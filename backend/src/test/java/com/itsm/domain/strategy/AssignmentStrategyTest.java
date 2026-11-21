package com.itsm.domain.strategy;

import com.itsm.domain.Category;
import com.itsm.domain.ITService;
import com.itsm.domain.Impact;
import com.itsm.domain.Incident;
import com.itsm.domain.Technician;
import com.itsm.domain.Urgency;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static com.itsm.domain.IncidentTestData.giveActiveIncidents;
import static com.itsm.domain.IncidentTestData.reported;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AssignmentStrategyTest {

    private static final Category NETWORK = new Category("NETWORK", "Network");
    private static final Category DATABASE = new Category("DATABASE", "Database");

    private final SkillBasedAssignmentStrategy skillBased = new SkillBasedAssignmentStrategy();
    private final LoadBasedAssignmentStrategy loadBased = new LoadBasedAssignmentStrategy();

    private final Incident networkIncident = reported("VPN down", "cannot connect", "NETWORK",
            new ITService("VPN", 2), LocalDateTime.now(), false);

    private static Technician tech(String id, int maxWorkload, int active, Category... skills) {
        Technician tech = new Technician(id, "Tech " + id, id + "@test.local", "hash", maxWorkload);
        for (Category skill : skills) {
            tech.addSkill(skill);
        }
        giveActiveIncidents(tech, active);
        return tech;
    }

    // ----- skill based -----

    @Test
    void skillBasedPicksTheLeastLoadedTechnicianWithTheSkill() {
        Technician busy = tech("A", 5, 3, NETWORK);
        Technician idle = tech("B", 5, 1, NETWORK);
        Technician idleWrongSkill = tech("C", 5, 0, DATABASE);
        Optional<Technician> chosen = skillBased.selectTechnician(networkIncident, List.of(busy, idle, idleWrongSkill));
        assertEquals(idle, chosen.orElseThrow());
    }

    @Test
    void skillBasedSkipsUnavailableAndFullTechnicians() {
        Technician unavailable = tech("A", 5, 0, NETWORK);
        unavailable.setAvailable(false);
        Technician full = tech("B", 2, 2, NETWORK);
        Technician ok = tech("C", 5, 4, NETWORK);
        assertEquals(ok, skillBased.selectTechnician(networkIncident, List.of(unavailable, full, ok)).orElseThrow());
    }

    @Test
    void skillBasedReturnsEmptyWhenNobodyHasTheSkill() {
        Technician dbOnly = tech("A", 5, 0, DATABASE);
        assertTrue(skillBased.selectTechnician(networkIncident, List.of(dbOnly)).isEmpty());
    }

    @Test
    void skillBasedReturnsEmptyForNoCandidates() {
        assertTrue(skillBased.selectTechnician(networkIncident, List.of()).isEmpty());
    }

    // ----- load based -----

    @Test
    void loadBasedIgnoresSkillsAndPicksTheLeastLoaded() {
        Technician skilledButBusy = tech("A", 5, 2, NETWORK);
        Technician unskilledIdle = tech("B", 5, 0, DATABASE);
        assertEquals(unskilledIdle,
                loadBased.selectTechnician(networkIncident, List.of(skilledButBusy, unskilledIdle)).orElseThrow());
    }

    @Test
    void loadBasedKeepsTheFirstOnATie() {
        Technician first = tech("A", 5, 1);
        Technician second = tech("B", 5, 1);
        assertEquals(first, loadBased.selectTechnician(networkIncident, List.of(first, second)).orElseThrow());
    }

    @Test
    void loadBasedReturnsEmptyWhenEveryoneIsFullOrUnavailable() {
        Technician full = tech("A", 1, 1);
        Technician unavailable = tech("B", 5, 0);
        unavailable.setAvailable(false);
        assertTrue(loadBased.selectTechnician(networkIncident, List.of(full, unavailable)).isEmpty());
    }

    @Test
    void strategiesHaveTheNamesTheSelectorUses() {
        assertEquals("SKILL_BASED", skillBased.getName());
        assertEquals("LOAD_BASED", loadBased.getName());
    }
}
