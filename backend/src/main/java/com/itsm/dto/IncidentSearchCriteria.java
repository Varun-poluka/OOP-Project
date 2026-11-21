package com.itsm.dto;

import com.itsm.domain.IncidentStatus;
import com.itsm.domain.Priority;

import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

public record IncidentSearchCriteria(
        IncidentStatus status,
        Priority priority,
        String categoryName,
        String technicianId,
        String reporterId,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
        Boolean breached,
        String text) {

    // Records are immutable, so restricting the search to one reporter makes a new copy.
    public IncidentSearchCriteria withReporterId(String newReporterId) {
        return new IncidentSearchCriteria(status, priority, categoryName, technicianId, newReporterId,
                from, to, breached, text);
    }
}
