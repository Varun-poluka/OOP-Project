package com.itsm.domain;

import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Deactivation (any user) and the technician settings an administrator can edit.
class UserAccountTest {

    private final Category network = new Category("NETWORK", "Network");
    private final Category hardware = new Category("HARDWARE", "Hardware");

    @Test
    void usersStartActiveAndCanBeDeactivatedAndReactivated() {
        Employee employee = new Employee("U-EMP-A", "Asha", "asha@test.local", "hash");
        assertTrue(employee.isActive());

        employee.deactivate();
        assertFalse(employee.isActive());

        employee.reactivate();
        assertTrue(employee.isActive());
    }

    @Test
    void deactivatingTwiceIsAConflict() {
        Employee employee = new Employee("U-EMP-A", "Asha", "asha@test.local", "hash");
        employee.deactivate();
        assertThrows(IllegalStateException.class, employee::deactivate);
        employee.reactivate();
        assertThrows(IllegalStateException.class, employee::reactivate);
    }

    @Test
    void deactivatedTechnicianTakesNoWorkEvenIfAvailable() {
        Technician tech = new Technician("U-TEC-A", "Neha", "neha@test.local", "hash", 3);
        tech.deactivate();
        assertTrue(tech.isAvailable());
        assertFalse(tech.canTakeMoreWork());
    }

    @Test
    void replaceSkillsSwapsTheWholeSet() {
        Technician tech = new Technician("U-TEC-A", "Neha", "neha@test.local", "hash", 3);
        tech.addSkill(network);

        tech.replaceSkills(Set.of(hardware));

        assertEquals(Set.of(hardware), tech.getSkills());
    }

    @Test
    void maxWorkloadMustBeAtLeastOneAndCoverCurrentWork() {
        Technician tech = new Technician("U-TEC-A", "Neha", "neha@test.local", "hash", 3);
        IncidentTestData.giveActiveIncidents(tech, 2);

        assertThrows(IllegalArgumentException.class, () -> tech.changeMaxWorkload(0));
        assertThrows(IllegalArgumentException.class, () -> tech.changeMaxWorkload(1));
        assertEquals(3, tech.getMaxWorkload());

        tech.changeMaxWorkload(2);
        assertEquals(2, tech.getMaxWorkload());
        assertFalse(tech.canTakeMoreWork()); // 2 of 2 used
    }
}
