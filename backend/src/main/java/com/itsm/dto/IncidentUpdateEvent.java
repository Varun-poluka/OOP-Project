package com.itsm.dto;

import com.itsm.domain.IncidentStatus;
import com.itsm.domain.Priority;
import com.itsm.service.intelligence.RiskLevel;

// Data of the SSE "incident" event: just enough for the browser to decide what to refetch.
public record IncidentUpdateEvent(
        String incidentId,
        String action,
        IncidentStatus status,
        Priority priority,
        RiskLevel riskLevel) { }
