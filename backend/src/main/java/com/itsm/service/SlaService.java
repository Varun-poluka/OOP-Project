package com.itsm.service;
import com.itsm.domain.Incident;
import com.itsm.domain.IncidentStatus;
import com.itsm.domain.Priority;
import com.itsm.domain.SLAPolicy;
import com.itsm.domain.exception.ResourceNotFoundException;
import com.itsm.dto.SlaPolicyResponse;
import com.itsm.repository.IncidentRepository;
import com.itsm.repository.SLAPolicyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class SlaService {

    private static final List<IncidentStatus> FINISHED =
            List.of(IncidentStatus.RESOLVED, IncidentStatus.VERIFIED, IncidentStatus.CLOSED);

    private final IncidentRepository incidentRepository;
    private final IncidentEventPublisher eventPublisher;
    private final SLAPolicyRepository policyRepository;

    public SlaService(IncidentRepository incidentRepository, IncidentEventPublisher eventPublisher,
                      SLAPolicyRepository policyRepository) {
        this.incidentRepository = incidentRepository;
        this.eventPublisher = eventPublisher;
        this.policyRepository = policyRepository;
    }

    public List<SlaPolicyResponse> getPolicies() {
        List<SLAPolicy> policies = new ArrayList<SLAPolicy>(policyRepository.findAll());
        policies.sort(Comparator.comparing(SLAPolicy::getPriority));
        List<SlaPolicyResponse> result = new ArrayList<SlaPolicyResponse>();
        for (SLAPolicy policy : policies) {
            result.add(SlaPolicyResponse.from(policy));
        }
        return result;
    }

    @Transactional
    public SlaPolicyResponse updatePolicy(Priority priority, int responseMinutes, int resolutionMinutes) {
        SLAPolicy policy = policyRepository.findById(priority).orElse(null);
        if (policy == null) {
            throw new ResourceNotFoundException("SLA policy", priority.name());
        }
        policy.update(responseMinutes, resolutionMinutes);
        return SlaPolicyResponse.from(policy);
    }

    @Transactional
    public int checkAll(LocalDateTime now) {
        int breaches = 0;
        for (Incident incident : incidentRepository.findByStatusNotIn(FINISHED)) {
            int before = incident.getAuditTrail().size();
            if (incident.checkSla(now)) {
                eventPublisher.publishNewEvents(incident, before);
                breaches++;
            }
        }
        return breaches;
    }
}