package com.itsm.service;
import com.itsm.domain.Incident;
import com.itsm.domain.IncidentStatus;
import com.itsm.repository.IncidentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class SlaService {

    private static final List<IncidentStatus> FINISHED =
            List.of(IncidentStatus.RESOLVED, IncidentStatus.VERIFIED, IncidentStatus.CLOSED);

    private final IncidentRepository incidentRepository;
    private final IncidentEventPublisher eventPublisher;

    public SlaService(IncidentRepository incidentRepository, IncidentEventPublisher eventPublisher) {
        this.incidentRepository = incidentRepository;
        this.eventPublisher = eventPublisher;
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