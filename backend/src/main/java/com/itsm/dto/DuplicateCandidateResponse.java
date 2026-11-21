package com.itsm.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.itsm.domain.IncidentStatus;
import com.itsm.service.intelligence.DuplicateMatch;

import java.util.List;

// NON_NULL: fields that are null are left out of the JSON. Employees get score and reasons as
// null, so they only see the id, title and status of someone else's incident.
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DuplicateCandidateResponse(
        String incidentId,
        String title,
        IncidentStatus status,
        Double score,
        List<String> reasons
) {
    public static DuplicateCandidateResponse full(DuplicateMatch match) {
        double rounded = Math.round(match.score() * 100) / 100.0;
        return new DuplicateCandidateResponse(match.incident().getId(), match.incident().getTitle(),
                match.incident().getStatus(), rounded, match.reasons());
    }

    public static DuplicateCandidateResponse limited(DuplicateMatch match) {
        return new DuplicateCandidateResponse(match.incident().getId(), match.incident().getTitle(),
                match.incident().getStatus(), null, null);
    }
}
