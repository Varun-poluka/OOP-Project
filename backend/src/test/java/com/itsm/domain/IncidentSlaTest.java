package com.itsm.domain;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static com.itsm.domain.IncidentTestData.RESOLUTION_MINUTES;
import static com.itsm.domain.IncidentTestData.RESPONSE_MINUTES;
import static com.itsm.domain.IncidentTestData.incident;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

// checkSla (the breach check). Response window 60 min, resolution window 240 min.
class IncidentSlaTest {

    private static final LocalDateTime T0 = LocalDateTime.of(2026, 1, 1, 9, 0);

    private static long count(Incident incident, String action) {
        return incident.getAuditTrail().stream().filter(r -> r.getAction().equals(action)).count();
    }

    @Test
    void startSlaSetsBothDeadlinesFromCreatedAt() {
        Incident i = incident(T0, true, null, null);
        assertEquals(T0.plusMinutes(RESPONSE_MINUTES), i.getResponseDueAt());
        assertEquals(T0.plusMinutes(RESOLUTION_MINUTES), i.getResolutionDueAt());
    }

    @Test
    void exactlyAtTheDueTimeIsNotABreach() {
        Incident i = incident(T0, true, null, null);
        assertFalse(i.checkSla(T0.plusMinutes(RESPONSE_MINUTES)));
        assertFalse(i.isResponseBreached());
    }

    @Test
    void checkSlaIsIdempotent() {
        Incident i = incident(T0, true, null, null);
        LocalDateTime late = T0.plusMinutes(RESPONSE_MINUTES + 1);
        assertTrue(i.checkSla(late));
        int auditAfterFirst = i.getAuditTrail().size();
        assertFalse(i.checkSla(late));                    // nothing new the second time
        assertFalse(i.checkSla(late.plusMinutes(10)));    // nor later
        assertEquals(auditAfterFirst, i.getAuditTrail().size());
        assertEquals(1, count(i, "SLA_RESPONSE_BREACHED"));
    }

    @Test
    void bothClocksBreachTogetherWhenNothingWasDone() {
        Incident i = incident(T0, true, null, null);
        assertTrue(i.checkSla(T0.plusMinutes(RESOLUTION_MINUTES + 1)));
        assertTrue(i.isResponseBreached());
        assertTrue(i.isResolutionBreached());
    }

    @Test
    void acknowledgingStopsTheResponseClock() {
        Incident i = incident(T0, true, T0.plusMinutes(10), null);
        assertFalse(i.checkSla(T0.plusMinutes(RESPONSE_MINUTES + 30)));
        assertFalse(i.isResponseBreached());
        // The resolution clock still runs.
        assertTrue(i.checkSla(T0.plusMinutes(RESOLUTION_MINUTES + 1)));
        assertTrue(i.isResolutionBreached());
        assertFalse(i.isResponseBreached());
    }

    @Test
    void resolvingStopsTheResolutionClock() {
        Incident i = incident(T0, true, T0.plusMinutes(10), T0.plusMinutes(100));
        assertFalse(i.checkSla(T0.plusMinutes(RESOLUTION_MINUTES * 2)));
        assertFalse(i.isResolutionBreached());
    }

    @Test
    void incidentWithoutSlaHasNothingToCheck() {
        Incident i = incident(T0, false, null, null);
        assertFalse(i.checkSla(T0.plusDays(30)));
        assertEquals(0, count(i, "SLA_RESPONSE_BREACHED"));
    }
}
