package com.itsm.service;

import com.itsm.domain.Incident;
import com.itsm.domain.IncidentStatus;
import com.itsm.domain.Priority;
import com.itsm.domain.Technician;
import com.itsm.dto.ReportSummary;
import com.itsm.dto.SlaSummary;
import com.itsm.dto.TechnicianWorkload;
import com.itsm.repository.IncidentRepository;
import com.itsm.repository.TechnicianRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ReportService {

    private static final int DEFAULT_RANGE_DAYS = 30;
    private static final Set<IncidentStatus> OPEN_STATUSES =
            EnumSet.of(IncidentStatus.ASSIGNED, IncidentStatus.ACKNOWLEDGED, IncidentStatus.IN_PROGRESS);
    private static final Set<IncidentStatus> RESOLVED_STATUSES =
            EnumSet.of(IncidentStatus.RESOLVED, IncidentStatus.VERIFIED, IncidentStatus.CLOSED);

    private final IncidentRepository incidentRepository;
    private final TechnicianRepository technicianRepository;

    public ReportService(IncidentRepository incidentRepository, TechnicianRepository technicianRepository) {
        this.incidentRepository = incidentRepository;
        this.technicianRepository = technicianRepository;
    }

    @Transactional(readOnly = true)
    public ReportSummary summary(LocalDateTime from, LocalDateTime to) {
        if (to == null) {
            to = LocalDateTime.now();
        }
        if (from == null) {
            from = to.minusDays(DEFAULT_RANGE_DAYS);
        }
        if (!from.isBefore(to)) {
            throw new IllegalArgumentException("'from' must be before 'to'");
        }

        // Loaded once and reused for the totals, the SLA figures and the workload.
        List<Incident> incidents = incidentRepository.findByCreatedAtGreaterThanEqualAndCreatedAtLessThan(from, to);

        Map<Priority, SlaSummary> byPriority = new EnumMap<>(Priority.class);
        for (Priority priority : Priority.values()) {
            List<Incident> withPriority = new ArrayList<>();
            for (Incident incident : incidents) {
                if (incident.getPriority() == priority) {
                    withPriority.add(incident);
                }
            }
            byPriority.put(priority, slaSummary(withPriority));
        }

        return new ReportSummary(
                from,
                to,
                incidents.size(),
                incidentRepository.countByStatus(from, to),
                incidentRepository.countByPriority(from, to),
                incidentRepository.countByCategory(from, to),
                slaSummary(incidents),
                byPriority,
                workload(incidents));
    }

    private SlaSummary slaSummary(List<Incident> incidents) {
        return new SlaSummary(
                incidents.size(),
                ReportCalculator.responseCompliance(incidents),
                ReportCalculator.resolutionCompliance(incidents),
                ReportCalculator.meanMinutesToAcknowledge(incidents),
                ReportCalculator.meanMinutesToResolve(incidents));
    }

    // Starts from every technician, so those with no incidents in the range still appear with zeros.
    private List<TechnicianWorkload> workload(List<Incident> incidents) {
        List<TechnicianWorkload> result = new ArrayList<>();
        for (Technician technician : technicianRepository.findAll()) {
            long open = 0;
            long resolved = 0;
            for (Incident incident : incidents) {
                if (!technician.equals(incident.getAssignedTechnician())) {
                    continue;
                }
                if (OPEN_STATUSES.contains(incident.getStatus())) {
                    open++;
                } else if (RESOLVED_STATUSES.contains(incident.getStatus())) {
                    resolved++;
                }
            }
            result.add(new TechnicianWorkload(technician.getId(), technician.getName(),
                    technician.isAvailable(), open, resolved));
        }
        return result;
    }
}
