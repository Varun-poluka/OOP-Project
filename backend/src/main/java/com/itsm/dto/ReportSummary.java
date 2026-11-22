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
        List<TechnicianWorkload> technicians,
        // Current backlog, independent of from/to: every incident not yet RESOLVED, VERIFIED or CLOSED.
        long openIncidents,
        // P1..P4 always present (0 when none). NEW incidents have no priority yet, so they count in
        // openIncidents but under no key here: the four values can add up to less than openIncidents.
        Map<Priority, Long> openByPriority,
        // Mean of the 1-5 ratings reporters gave in the range; null when nobody rated.
        Double averageRating,
        long ratingCount) { }
