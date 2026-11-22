package com.itsm.service;

import com.itsm.domain.Incident;
import com.itsm.domain.IncidentStatus;
import com.itsm.domain.Technician;
import com.itsm.domain.exception.ResourceNotFoundException;
import com.itsm.dto.TechnicianRecommendationResponse;
import com.itsm.repository.IncidentRepository;
import com.itsm.repository.TechnicianRepository;
import com.itsm.service.intelligence.TechnicianScore;
import com.itsm.service.intelligence.TechnicianScorer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class RecommendationService {

    private static final int TOP = 3;
    private static final List<IncidentStatus> DONE =
            List.of(IncidentStatus.RESOLVED, IncidentStatus.VERIFIED, IncidentStatus.CLOSED);

    private final IncidentRepository incidentRepository;
    private final TechnicianRepository technicianRepository;
    private final TechnicianScorer scorer;

    public RecommendationService(IncidentRepository incidentRepository, TechnicianRepository technicianRepository,
                                 TechnicianScorer scorer) {
        this.incidentRepository = incidentRepository;
        this.technicianRepository = technicianRepository;
        this.scorer = scorer;
    }

    @Transactional(readOnly = true)
    public List<TechnicianRecommendationResponse> recommend(String incidentId) {
        Incident incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new ResourceNotFoundException("Incident", incidentId));
        String categoryName = incident.getCategory().getName();

        List<TechnicianScore> scores = new ArrayList<>();
        for (Technician tech : technicianRepository.findAll()) {
            if (!tech.isActive()) {
                continue; // a deactivated account can never be assigned, so it is never recommended
            }
            int resolved = (int) incidentRepository.countByAssignedTechnicianIdAndCategoryNameAndStatusIn(
                    tech.getId(), categoryName, DONE);
            scores.add(scorer.score(tech, incident.getCategory(), resolved));
        }

        List<TechnicianRecommendationResponse> result = new ArrayList<>();
        for (TechnicianScore score : scorer.rank(scores, TOP)) {
            result.add(TechnicianRecommendationResponse.from(score));
        }
        return List.copyOf(result);
    }
}
