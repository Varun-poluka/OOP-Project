package com.itsm.service.notification;

import com.itsm.domain.AuditRecord;
import com.itsm.domain.Incident;
import com.itsm.domain.IncidentStatus;
import com.itsm.domain.IncidentTestData;
import com.itsm.domain.event.IncidentEvent;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NotificationMessageFormatterTest {

    private static IncidentEvent event(String action, String actorName, String description) {
        return new IncidentEvent("INC-0026", "Lab 3 PCs stuck", action, IncidentStatus.ASSIGNED, IncidentStatus.ASSIGNED,
                description, "U-X", actorName, "U-EMP-1", "emp@itsm.local", "U-TEC-2", "tech@itsm.local",
                LocalDateTime.of(2026, 11, 21, 18, 50));
    }

    private static String format(String action, String actorName, String description) {
        return NotificationMessageFormatter.format(event(action, actorName, description), false);
    }

    // The last audit record of a real incident, as the publisher would send it.
    private static String lastEventOf(Incident incident) {
        List<AuditRecord> trail = incident.getAuditTrail();
        return NotificationMessageFormatter.format(IncidentEvent.from(incident, trail.get(trail.size() - 1)), false);
    }

    @Test
    void keepsTheIncidentIdAndTitlePrefix() {
        assertEquals("INC-0026 (Lab 3 PCs stuck): Acknowledged by Neha Network",
                format("ACKNOWLEDGED", "Neha Network", "Neha Network Acknowledged"));
    }

    @Test
    void assignmentSaysYouOnlyToTheAssignedTechnician() {
        IncidentEvent assigned = event("ASSIGNED", "SYSTEM", "Assigned to Neha Network");
        assertEquals("INC-0026 (Lab 3 PCs stuck): Assigned to you", NotificationMessageFormatter.format(assigned, true));
        assertEquals("INC-0026 (Lab 3 PCs stuck): Assigned to Neha Network", NotificationMessageFormatter.format(assigned, false));
    }

    @Test
    void reassignmentNamesThePreviousTechnician() {
        IncidentEvent reassigned = event("REASSIGNED", "Ravi Admin", "Reassigned from Arjun Apps to Kiran Support");
        assertEquals("INC-0026 (Lab 3 PCs stuck): Reassigned to you (from Arjun Apps)",
                NotificationMessageFormatter.format(reassigned, true));
        assertEquals("INC-0026 (Lab 3 PCs stuck): Reassigned from Arjun Apps to Kiran Support",
                NotificationMessageFormatter.format(reassigned, false));
    }

    @Test
    void lifecycleStepsReadAsSentences() {
        assertEquals("INC-0026 (Lab 3 PCs stuck): Classified as P3", format("CLASSIFIED", "SYSTEM", "Priority set to: P3"));
        assertEquals("INC-0026 (Lab 3 PCs stuck): Work started by Neha Network",
                format("STARTED", "Neha Network", "Neha Network Has started the work"));
        assertEquals("INC-0026 (Lab 3 PCs stuck): New note from Neha Network: SSD not detected",
                format("NOTE_ADDED", "Neha Network", "SSD not detected"));
        assertEquals("INC-0026 (Lab 3 PCs stuck): Resolved by Neha Network: Replaced the SSD",
                format("RESOLVED", "Neha Network", "Replaced the SSD"));
        assertEquals("INC-0026 (Lab 3 PCs stuck): Verified by Asha Employee",
                format("VERIFIED", "Asha Employee", "Verified by: Asha Employee"));
        assertEquals("INC-0026 (Lab 3 PCs stuck): Closed by Ravi Admin",
                format("CLOSED", "Ravi Admin", "Incident closed by: Ravi Admin"));
        assertEquals("INC-0026 (Lab 3 PCs stuck): Reopened by Asha Employee: still broken",
                format("REOPENED", "Asha Employee", "Reopened: still broken"));
    }

    @Test
    void slaTimesAreReadable() {
        assertEquals("INC-0026 (Lab 3 PCs stuck): Response SLA breached: not acknowledged by 20 Nov, 1:26 PM",
                format("SLA_RESPONSE_BREACHED", "SYSTEM", "Not Acknowledged by 2026-11-20T13:26:22"));
        assertEquals("INC-0026 (Lab 3 PCs stuck): Resolution SLA at risk: resolution due by 21 Nov, 6:50 PM",
                format("SLA_RESOLUTION_AT_RISK", "SYSTEM", "Resolution due by 2026-11-21T18:50:00.123456"));
    }

    @Test
    void priorityRaiseKeepsItsReason() {
        assertEquals("INC-0026 (Lab 3 PCs stuck): Priority raised from P3 to P2: an outage of Network impacts 11 dependent services",
                format("PRIORITY_RAISED", "SYSTEM", "Raised from P3 to P2: an outage of Network impacts 11 dependent services"));
    }

    @Test
    void serviceImpactListsAtMostThreeServices() {
        assertEquals("INC-0026 (Lab 3 PCs stuck): Service impact: an outage of Network may affect SSO, Monitoring, Email and 2 more",
                format("SERVICE_IMPACT", "SYSTEM",
                        "An outage of Network may impact: SSO (1 hop), Monitoring (1 hop), Email (2 hops), LMS (2 hops), DNS (2 hops)"));
        assertEquals("INC-0026 (Lab 3 PCs stuck): Service impact: an outage of ERP may affect Payroll",
                format("SERVICE_IMPACT", "SYSTEM", "An outage of ERP may impact: Payroll (1 hop)"));
    }

    @Test
    void namesAreJoinedAsEnglish() {
        assertEquals("A", NotificationMessageFormatter.listOf(List.of("A")));
        assertEquals("A and B", NotificationMessageFormatter.listOf(List.of("A", "B")));
        assertEquals("A, B and C", NotificationMessageFormatter.listOf(List.of("A", "B", "C")));
        assertEquals("A, B, C and 1 more", NotificationMessageFormatter.listOf(List.of("A", "B", "C", "D")));
    }

    @Test
    void unknownActionFallsBackToSentenceCase() {
        assertEquals("INC-0026 (Lab 3 PCs stuck): Some new action: details", format("SOME_NEW_ACTION", "SYSTEM", "details"));
    }

    @Test
    void unexpectedDescriptionIsShownUnchanged() {
        assertEquals("INC-0026 (Lab 3 PCs stuck): Response SLA breached: late", format("SLA_RESPONSE_BREACHED", "SYSTEM", "late"));
        assertEquals("INC-0026 (Lab 3 PCs stuck): Service impact: several services", format("SERVICE_IMPACT", "SYSTEM", "several services"));
    }

    @Test
    void longMessagesAreCutTo500Characters() {
        String message = format("NOTE_ADDED", "Neha Network", "x".repeat(1000));
        assertEquals(NotificationMessageFormatter.MAX_LENGTH, message.length());
        assertTrue(message.endsWith("..."));
    }

    // Guard: the SLA texts come from Incident.checkSla / checkSlaRisk. If they are reworded so the
    // formatter no longer finds the time, these fail instead of users seeing raw ISO times.
    // IncidentTestData uses a P2 policy: response 60 minutes, resolution 240 minutes.
    @Test
    void realBreachDescriptionsAreFormatted() {
        Incident incident = IncidentTestData.incident(LocalDateTime.of(2026, 11, 20, 9, 0), true, null, null);

        incident.checkSla(LocalDateTime.of(2026, 11, 20, 15, 0)); // both clocks breached

        List<AuditRecord> trail = incident.getAuditTrail();
        String response = NotificationMessageFormatter.format(IncidentEvent.from(incident, trail.get(trail.size() - 2)), false);
        assertTrue(response.endsWith("Response SLA breached: not acknowledged by 20 Nov, 10:00 AM"), response);
        assertTrue(lastEventOf(incident).endsWith("Resolution SLA breached: not resolved by 20 Nov, 1:00 PM"),
                lastEventOf(incident));
    }

    @Test
    void realRiskDescriptionIsFormatted() {
        Incident incident = IncidentTestData.incident(LocalDateTime.of(2026, 11, 20, 9, 0), true, null, null);

        incident.checkSlaRisk(LocalDateTime.of(2026, 11, 20, 9, 50)); // 50 of 60 response minutes used

        assertTrue(lastEventOf(incident).endsWith("Response SLA at risk: response due by 20 Nov, 10:00 AM"),
                lastEventOf(incident));
    }
}
