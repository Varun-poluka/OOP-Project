package com.itsm.dto;

import com.itsm.domain.AuditRecord;
import com.itsm.domain.IncidentStatus;

import java.time.LocalDateTime;

public record AuditRecordResponse(
        LocalDateTime timestamp,
        String actorName,
        String action,
        IncidentStatus previousStatus,
        IncidentStatus newStatus,
        String description
) {
    public static AuditRecordResponse from(AuditRecord record) {
        String actorName = (record.getActor() == null) ? "SYSTEM" : record.getActor().getName();
        return new AuditRecordResponse(
                record.getTimestamp(),
                actorName,
                record.getAction(),
                record.getPreviousStatus(),
                record.getNewStatus(),
                record.getDescription());
    }
}
