package com.itsm.dto;

import com.itsm.domain.AuditRecord;
import com.itsm.domain.IncidentStatus;

import java.time.LocalDateTime;

// One row of the system-wide audit log. Unlike AuditRecordResponse it says which incident and which user.
public record AuditLogEntry(
        Long id,
        String incidentId,
        LocalDateTime timestamp,
        String actorId,
        String actorName,
        String action,
        IncidentStatus previousStatus,
        IncidentStatus newStatus,
        String description
) {
    public static AuditLogEntry from(AuditRecord record) {
        boolean system = record.getActor() == null;
        return new AuditLogEntry(
                record.getId(),
                record.getIncidentId(),
                record.getTimestamp(),
                system ? null : record.getActor().getId(),
                system ? "SYSTEM" : record.getActor().getName(),
                record.getAction(),
                record.getPreviousStatus(),
                record.getNewStatus(),
                record.getDescription());
    }
}
