package com.itsm.dto;

import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

// Query parameters of GET /api/admin/audit; every one is optional. from is included, to excluded.
public record AuditLogCriteria(
        String incidentId,
        String actorId,
        String action,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to) { }
