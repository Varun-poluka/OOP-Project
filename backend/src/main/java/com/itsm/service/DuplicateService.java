package com.itsm.service;

import com.itsm.domain.Employee;
import com.itsm.domain.ITService;
import com.itsm.domain.User;
import com.itsm.domain.exception.ResourceNotFoundException;
import com.itsm.dto.DuplicateCandidateResponse;
import com.itsm.dto.DuplicateCheckRequest;
import com.itsm.repository.ITServiceRepository;
import com.itsm.repository.IncidentRepository;
import com.itsm.repository.UserRepository;
import com.itsm.service.intelligence.DuplicateDetector;
import com.itsm.service.intelligence.DuplicateMatch;
import com.itsm.service.intelligence.IncidentText;
import com.itsm.service.intelligence.TokenSimilarityDuplicateDetector;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class DuplicateService {

    private final DuplicateDetector detector;
    private final IncidentRepository incidentRepository;
    private final ITServiceRepository itServiceRepository;
    private final UserRepository userRepository;

    public DuplicateService(DuplicateDetector detector, IncidentRepository incidentRepository,
                            ITServiceRepository itServiceRepository, UserRepository userRepository) {
        this.detector = detector;
        this.incidentRepository = incidentRepository;
        this.itServiceRepository = itServiceRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<DuplicateCandidateResponse> check(DuplicateCheckRequest request, String actorId) {
        User actor = userRepository.findById(actorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", actorId));
        String serviceName = null;
        if (request.affectedServiceId() != null) {
            ITService service = itServiceRepository.findById(request.affectedServiceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Service", String.valueOf(request.affectedServiceId())));
            serviceName = service.getName();
        }
        String categoryName = (request.categoryName() == null) ? null : request.categoryName().toUpperCase();
        IncidentText probe = new IncidentText(request.title(), request.description(), categoryName, serviceName);
        return find(probe, actor);
    }

    // Also used by IncidentService.report, inside its transaction.
    List<DuplicateCandidateResponse> find(IncidentText probe, User actor) {
        LocalDateTime now = LocalDateTime.now();
        // Cheap pre-filter in the database; the detector applies the exact rules.
        List<DuplicateMatch> matches = detector.findDuplicates(probe,
                incidentRepository.findByCreatedAtGreaterThanEqual(now.minusDays(TokenSimilarityDuplicateDetector.WINDOW_DAYS)),
                now);
        List<DuplicateCandidateResponse> result = new ArrayList<>();
        for (DuplicateMatch match : matches) {
            // Employees may not see other people's incident details, so only id, title and status.
            if (actor instanceof Employee) {
                result.add(DuplicateCandidateResponse.limited(match));
            } else {
                result.add(DuplicateCandidateResponse.full(match));
            }
        }
        return List.copyOf(result);
    }
}
