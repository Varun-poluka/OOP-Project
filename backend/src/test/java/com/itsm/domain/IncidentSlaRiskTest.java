package com.itsm.domain;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static com.itsm.domain.IncidentTestData.incident;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Response window 60 min, resolution window 240 min, so 75% is 45 min and 180 min.
class IncidentSlaRiskTest {

    private static final LocalDateTime T0 = LocalDateTime.of(2026, 1, 1, 9, 0);

    private static long count(Incident incident, String action) {
        return incident.getAuditTrail().stream().filter(r -> r.getAction().equals(action)).count();
    }

    @Test
    void belowThresholdIsNotAtRisk() {
        Incident i = incident(T0, true, null, null);
        assertFalse(i.checkSlaRisk(T0.plusMinutes(44)));
        assertFalse(i.isResponseAtRisk());
    }

    @Test
    void responseAtRiskIsSetOnceAndAuditedOnce() {
        Incident i = incident(T0, true, null, null);
        assertTrue(i.checkSlaRisk(T0.plusMinutes(45)));
        assertTrue(i.isResponseAtRisk());
        assertFalse(i.isResolutionAtRisk());
        assertFalse(i.checkSlaRisk(T0.plusMinutes(50))); // idempotent: nothing new
        assertEquals(1, count(i, "SLA_RESPONSE_AT_RISK"));
    }

    @Test
    void resolutionAtRiskAfterAcknowledgement() {
        Incident i = incident(T0, true, T0.plusMinutes(10), null);
        assertTrue(i.checkSlaRisk(T0.plusMinutes(180)));
        assertFalse(i.isResponseAtRisk()); // response clock stopped when acknowledged
        assertTrue(i.isResolutionAtRisk());
        assertEquals(1, count(i, "SLA_RESOLUTION_AT_RISK"));
    }

    @Test
    void breachedClockIsNotAlsoMarkedAtRisk() {
        Incident i = incident(T0, true, null, null);
        i.checkSla(T0.plusMinutes(61));
        i.checkSlaRisk(T0.plusMinutes(61));
        assertTrue(i.isResponseBreached());
        assertFalse(i.isResponseAtRisk());
    }

    @Test
    void noSlaMeansNoRisk() {
        Incident i = incident(T0, false, null, null);
        assertFalse(i.checkSlaRisk(T0.plusDays(10)));
    }
}
