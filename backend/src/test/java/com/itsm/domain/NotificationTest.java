package com.itsm.domain;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class NotificationTest {

    // Regression test: the constructor used to drop incidentId, so every notification had null.
    @Test
    void keepsTheIncidentId() {
        Employee recipient = new Employee("U-EMP-N", "Recipient", "n@test.local", "hash");

        Notification notification = new Notification(recipient, "INC-0042", "INC-0042: ASSIGNED");

        assertEquals("INC-0042", notification.getIncidentId());
        assertFalse(notification.isRead());
    }
}
