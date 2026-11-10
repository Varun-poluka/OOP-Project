package com.itsm.service.notification;

import com.itsm.domain.event.IncidentEvent;

final class NotificationRules {
    private NotificationRules() { }

    static boolean shouldNotifyReporter(IncidentEvent event) {
        return !event.reporterId().equals(event.actorId());
    }

    static boolean shouldNotifyTechnician(IncidentEvent event) {
        if (event.technicianId() == null) {
            return false;
        }
        String action = event.action();
        return action.equals("ASSIGNED") || action.equals("REASSIGNED") || action.equals("REOPENED");
    }

    static String message(IncidentEvent event) {
        return event.incidentId() + " (" + event.incidentTitle() + "): " + event.action() + " - " + event.description();
    }
}
