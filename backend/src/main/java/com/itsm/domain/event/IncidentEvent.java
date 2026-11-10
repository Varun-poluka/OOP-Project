package com.itsm.domain.event;

import com.itsm.domain.*;

import java.time.LocalDateTime;

public record IncidentEvent(
        String incidentId,
        String incidentTitle,
        String action,
        IncidentStatus previousStatus,
        IncidentStatus newStatus,
        String description,
        String actorId,
        String actorName,
        String reporterId,
        String reporterEmail,
        String technicianId,
        String technicianEmail,
        LocalDateTime timestamp
) {
    public static IncidentEvent from(Incident incident, AuditRecord record){
        User actor = record.getActor();
        Technician tech = incident.getAssignedTechnician();
        return new IncidentEvent(
                incident.getId(),
                incident.getTitle(),
                record.getAction(),
                record.getPreviousStatus(),
                record.getNewStatus(),
                record.getDescription(),
                (actor == null) ? null : actor.getId(),
                (actor == null) ? "SYSTEM" : actor.getName(),
                incident.getReporter().getId(),
                incident.getReporter().getEmail(),
                (tech == null) ? null : tech.getId(),
                (tech == null) ? null : tech.getEmail(),
                record.getTimestamp());
    }
}
