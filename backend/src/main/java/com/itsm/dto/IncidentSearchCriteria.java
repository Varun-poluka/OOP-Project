package com.itsm.dto;

import com.itsm.domain.IncidentStatus;
import com.itsm.domain.Priority;

import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

public record IncidentSearchCriteria(
        IncidentStatus status,
        Priority priority,
        String categoryName,
        Long technicianId,
        Long reporterId,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
        Boolean breached,
        String text) {
}
