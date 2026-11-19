package com.itsm.dto;

import com.itsm.domain.Priority;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record ReportSummary(
        LocalDateTime from,
        LocalDateTime to,
        long totalIncidents,
        List<CountRow> byStatus,
        List<CountRow> byPriority,
        List<CountRow> byCategory,
        SlaSummary overall,
        Map<Priority, SlaSummary> byPriorityPerformance,
        List<TechnicianWorkload> technicians) { }
