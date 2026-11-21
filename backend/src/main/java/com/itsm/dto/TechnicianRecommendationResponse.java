package com.itsm.dto;

import com.itsm.domain.Technician;
import com.itsm.service.intelligence.TechnicianScore;

import java.util.List;

public record TechnicianRecommendationResponse(
        String technicianId,
        String name,
        int score,
        boolean available,
        int activeIncidents,
        int maxWorkload,
        List<String> reasons
) {
    public static TechnicianRecommendationResponse from(TechnicianScore score) {
        Technician tech = score.technician();
        return new TechnicianRecommendationResponse(tech.getId(), tech.getName(), score.points(),
                tech.isAvailable(), tech.getActiveIncidents(), tech.getMaxWorkload(), score.reasons());
    }
}
