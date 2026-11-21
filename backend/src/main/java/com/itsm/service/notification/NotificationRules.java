package com.itsm.service.notification;

import com.itsm.domain.event.IncidentEvent;

import java.util.Set;

final class NotificationRules {
    private NotificationRules() { }

    // Internal operational warnings: they go to admins (and at-risk ones to the technician), not to the reporter.
    private static final Set<String> INTERNAL_ACTIONS = Set.of(
            "SLA_RESPONSE_AT_RISK", "SLA_RESOLUTION_AT_RISK", "PRIORITY_RAISED", "SERVICE_IMPACT");

    static boolean shouldNotifyReporter(IncidentEvent event) {
        return !event.reporterId().equals(event.actorId()) && !INTERNAL_ACTIONS.contains(event.action());
    }

    static boolean shouldNotifyAdmins(IncidentEvent event) {
        return INTERNAL_ACTIONS.contains(event.action());
    }

    static boolean shouldNotifyTechnician(IncidentEvent event) {
        if (event.technicianId() == null) {
            return false;
        }
        String action = event.action();
        return action.equals("ASSIGNED") || action.equals("REASSIGNED") || action.equals("REOPENED") || action.equals("SLA_RESPONSE_BREACHED") || action.equals("SLA_RESOLUTION_BREACHED")
                || action.equals("SLA_RESPONSE_AT_RISK") || action.equals("SLA_RESOLUTION_AT_RISK");
    }
}
