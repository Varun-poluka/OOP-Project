package com.itsm.service.notification;

import com.itsm.domain.IncidentStatus;
import com.itsm.domain.event.IncidentEvent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Who gets notified for each action. Same package, because NotificationRules is package-private.
class NotificationRulesTest {

    private static final String REPORTER = "U-EMP-1";
    private static final String TECH = "U-TEC-1";
    private static final String ADMIN = "U-ADM-1";

    private static IncidentEvent event(String action, String actorId, String technicianId, String description) {
        return new IncidentEvent("INC-0001", "Printer jam", action, IncidentStatus.ASSIGNED, IncidentStatus.ACKNOWLEDGED,
                description, actorId, "Actor", REPORTER, "emp@itsm.local", technicianId,
                (technicianId == null) ? null : "tech@itsm.local", LocalDateTime.now());
    }

    private static IncidentEvent event(String action, String actorId) {
        return event(action, actorId, TECH, "details");
    }

    @ParameterizedTest
    @ValueSource(strings = {"ASSIGNED", "ACKNOWLEDGED", "STARTED", "NOTE_ADDED", "RESOLVED", "CLOSED",
            "SLA_RESPONSE_BREACHED"})
    void reporterHearsAboutChangesMadeBySomeoneElse(String action) {
        assertTrue(NotificationRules.shouldNotifyReporter(event(action, TECH)));
    }

    @Test
    void reporterIsNotToldAboutTheirOwnAction() {
        assertFalse(NotificationRules.shouldNotifyReporter(event("VERIFIED", REPORTER)));
    }

    @Test
    void systemEventsWithNoActorReachTheReporter() {
        assertTrue(NotificationRules.shouldNotifyReporter(event("SLA_RESOLUTION_BREACHED", null)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"SLA_RESPONSE_AT_RISK", "SLA_RESOLUTION_AT_RISK", "PRIORITY_RAISED", "SERVICE_IMPACT"})
    void internalActionsGoToAdminsAndNotTheReporter(String action) {
        IncidentEvent event = event(action, null);
        assertTrue(NotificationRules.shouldNotifyAdmins(event));
        assertFalse(NotificationRules.shouldNotifyReporter(event));
    }

    @ParameterizedTest
    @ValueSource(strings = {"CREATED", "ASSIGNED", "RESOLVED", "CLOSED", "SLA_RESPONSE_BREACHED"})
    void ordinaryActionsDoNotGoToAdmins(String action) {
        assertFalse(NotificationRules.shouldNotifyAdmins(event(action, ADMIN)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"ASSIGNED", "REASSIGNED", "REOPENED", "SLA_RESPONSE_BREACHED", "SLA_RESOLUTION_BREACHED",
            "SLA_RESPONSE_AT_RISK", "SLA_RESOLUTION_AT_RISK"})
    void technicianHearsAboutWorkAndDeadlines(String action) {
        assertTrue(NotificationRules.shouldNotifyTechnician(event(action, ADMIN)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"CREATED", "CLASSIFIED", "ACKNOWLEDGED", "STARTED", "NOTE_ADDED", "RESOLVED", "CLOSED"})
    void technicianIsNotToldAboutOtherActions(String action) {
        assertFalse(NotificationRules.shouldNotifyTechnician(event(action, TECH)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"COMMENT_ADDED", "INFO_PROVIDED", "FEEDBACK_GIVEN"})
    void technicianHearsWhatTheReporterAdds(String action) {
        IncidentEvent event = event(action, REPORTER);
        assertTrue(NotificationRules.shouldNotifyTechnician(event));
        assertFalse(NotificationRules.shouldNotifyReporter(event)); // the reporter did it themselves
    }

    @Test
    void reporterIsAskedForInformation() {
        IncidentEvent event = event("INFO_REQUESTED", TECH);
        assertTrue(NotificationRules.shouldNotifyReporter(event));
        assertFalse(NotificationRules.shouldNotifyTechnician(event));
    }

    @Test
    void noTechnicianMeansNoTechnicianNotification() {
        assertFalse(NotificationRules.shouldNotifyTechnician(event("SLA_RESPONSE_BREACHED", null, null, "late")));
    }
}
