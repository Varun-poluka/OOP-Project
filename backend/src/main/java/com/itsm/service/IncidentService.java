package com.itsm.service;

import com.itsm.domain.*;
import com.itsm.domain.event.*;
import com.itsm.domain.exception.ResourceNotFoundException;
import com.itsm.domain.exception.UnauthorizedActionException;
import com.itsm.domain.strategy.PriorityCalculator;
import com.itsm.dto.*;
import com.itsm.repository.*;
import com.itsm.service.intelligence.ImpactedService;
import com.itsm.service.intelligence.IncidentText;
import com.itsm.service.intelligence.RiskLevel;
import com.itsm.service.intelligence.ServiceImpactAnalyzer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class IncidentService {

    private static final Set<String> SORTABLE_FIELDS = Set.of("createdAt", "priority", "status", "title");
    private static final List<IncidentStatus> FINISHED =
            List.of(IncidentStatus.RESOLVED, IncidentStatus.VERIFIED, IncidentStatus.CLOSED);
    // A technician's own work: assigned to them and not yet resolved.
    private static final List<IncidentStatus> WORKING =
            List.of(IncidentStatus.ASSIGNED, IncidentStatus.ACKNOWLEDGED, IncidentStatus.IN_PROGRESS);
    // Most urgent first: breached before everything else, then the highest share of the SLA window used.
    private static final Comparator<IncidentResponse> MOST_URGENT_FIRST =
            Comparator.comparing((IncidentResponse r) -> r.riskLevel() != RiskLevel.BREACHED)
                    .thenComparing(r -> (r.slaPercentUsed() == null) ? 0 : r.slaPercentUsed(), Comparator.reverseOrder());

    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;
    private final TechnicianRepository technicianRepository;
    private final CategoryRepository categoryRepository;
    private final ITServiceRepository itServiceRepository;
    private final PriorityCalculator priorityCalculator;
    private final AssignmentStrategySelector strategySelector;
    private final IncidentEventPublisher eventPublisher;
    private final SLAPolicyRepository slaPolicyRepository;
    private final ServiceImpactAnalyzer impactAnalyzer;
    private final DuplicateService duplicateService;

    public IncidentService(IncidentRepository incidentRepository,
                           UserRepository userRepository,
                           TechnicianRepository technicianRepository,
                           CategoryRepository categoryRepository,
                           ITServiceRepository itServiceRepository,
                           PriorityCalculator priorityCalculator,
                           AssignmentStrategySelector strategySelector,
                           IncidentEventPublisher eventPublisher,
                           SLAPolicyRepository slaPolicyRepository,
                           ServiceImpactAnalyzer impactAnalyzer,
                           DuplicateService duplicateService) {
        this.impactAnalyzer = impactAnalyzer;
        this.duplicateService = duplicateService;
        this.eventPublisher = eventPublisher;
        this.incidentRepository = incidentRepository;
        this.userRepository = userRepository;
        this.technicianRepository = technicianRepository;
        this.categoryRepository = categoryRepository;
        this.itServiceRepository = itServiceRepository;
        this.slaPolicyRepository = slaPolicyRepository;
        this.priorityCalculator = priorityCalculator;
        this.strategySelector = strategySelector;
    }
    // ===== 4.2 Private helpers =====

    private SLAPolicy findPolicy(Priority priority){
        return slaPolicyRepository.findById(priority).orElseThrow(() -> new ResourceNotFoundException("SLA policy", priority.name()));
    }

    private Incident findIncident(String id) {
        return incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident", id));
    }

    private Technician findTechnician(String id) {
        return technicianRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Technician", id));
    }

    private User findUser(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    private Employee findEmployee(String id) {
        User user = findUser(id);
        if (!(user instanceof Employee)) {
            throw new IllegalArgumentException("User " + id + " is not an employee");
        }
        return (Employee) user;
    }

    private String nextIncidentId() {
        return String.format("INC-%04d", incidentRepository.count() + 1);
    }

    // The reporter is the caller for employees; an admin must name the employee they report for.
    private Employee findReporter(CreateIncidentRequest request, User actor) {
        if (actor instanceof Employee) {
            if (request.onBehalfOfEmployeeId() != null && !request.onBehalfOfEmployeeId().equals(actor.getId())) {
                throw new UnauthorizedActionException("Employees can only report incidents for themselves");
            }
            return (Employee) actor;
        }
        if (actor instanceof Administrator) {
            if (request.onBehalfOfEmployeeId() == null || request.onBehalfOfEmployeeId().isBlank()) {
                throw new IllegalArgumentException("onBehalfOfEmployeeId is required when an administrator reports");
            }
            return findEmployee(request.onBehalfOfEmployeeId());
        }
        throw new UnauthorizedActionException("Only employees and administrators can report incidents");
    }

    // Employees may only see incidents they reported; technicians and admins see all.
    private void requireCanView(Incident incident, User actor) {
        if (actor instanceof Employee && !incident.getReporter().equals(actor)) {
            throw new UnauthorizedActionException("You can only view incidents you reported");
        }
    }

    // ===== 4.3 Use cases =====
    // actorId is always the id from the caller's verified token, never from the request body.

    @Transactional
    public IncidentResponse report(CreateIncidentRequest request, String actorId) {
        User actor = findUser(actorId);
        Employee reporter = findReporter(request, actor);

        String categoryName = request.categoryName().toUpperCase();
        Category category = categoryRepository.findById(categoryName)
                .orElseThrow(() -> new ResourceNotFoundException("Category", categoryName));

        ITService service = itServiceRepository.findById(request.serviceId())
                .orElseThrow(() -> new ResourceNotFoundException("Service", String.valueOf(request.serviceId())));

        Incident incident = new Incident(nextIncidentId(), request.title(), request.description(),
                reporter, category, service, request.impact(), request.urgency());

        // Reporting never blocks on duplicates: they are only returned as a hint.
        List<DuplicateCandidateResponse> duplicates = duplicateService.find(IncidentText.of(incident), actor);

        // base = what the plain weighted formula says; priority = after the dependency-aware decorator.
        Priority base = priorityCalculator.calculate(request.impact(), request.urgency(), service.getBusinessCriticality());
        Priority priority = priorityCalculator.calculate(request.impact(), request.urgency(), service);
        incident.classify(priority);
        incident.startSla(findPolicy(priority));

        List<ImpactedService> impacted = impactAnalyzer.analyze(service, itServiceRepository.findAll());
        if (priority != base) {
            incident.recordSystemEvent("PRIORITY_RAISED", "Raised from " + base + " to " + priority
                    + ": an outage of " + service.getName() + " impacts " + impacted.size() + " dependent services");
        }
        if (!impacted.isEmpty()) {
            incident.recordSystemEvent("SERVICE_IMPACT", "An outage of " + service.getName()
                    + " may impact: " + describe(impacted));
        }

        List<Technician> candidates = technicianRepository.findByAvailableTrue();
        Optional<Technician> chosen = strategySelector.getCurrent().selectTechnician(incident, candidates);
        if(chosen.isPresent()){
            incident.assignTo(chosen.get());
        }

        Incident saved = incidentRepository.save(incident);
        eventPublisher.publishNewEvents(saved,0);
        return IncidentResponse.from(saved).withPossibleDuplicates(duplicates);
    }

    private static String describe(List<ImpactedService> impacted) {
        StringBuilder text = new StringBuilder();
        for (ImpactedService item : impacted) {
            if (text.length() > 0) {
                text.append(", ");
            }
            text.append(item.service().getName()).append(" (").append(item.distance()).append(" hop")
                    .append(item.distance() == 1 ? "" : "s").append(")");
        }
        return text.toString();
    }

    // Unfinished incidents at HIGH risk, flagged at risk, or already breached; breached first, then by share of window used.
    @Transactional(readOnly = true)
    public List<IncidentResponse> atRisk(String actorId) {
        User actor = findUser(actorId);
        List<Incident> incidents;
        if (actor instanceof Technician) {
            incidents = incidentRepository.findByAssignedTechnicianIdAndStatusNotIn(actorId, FINISHED);
        } else if (actor instanceof Administrator) {
            incidents = incidentRepository.findByStatusNotIn(FINISHED);
        } else {
            throw new UnauthorizedActionException("Only technicians and administrators can view at-risk incidents");
        }
        List<IncidentResponse> result = new ArrayList<>();
        for (Incident incident : incidents) {
            IncidentResponse response = IncidentResponse.from(incident);
            // Also include incidents the SLA check flagged as at risk whose clock is still running.
            boolean flagged = (incident.isResponseAtRisk() && incident.getAcknowledgedAt() == null)
                    || (incident.isResolutionAtRisk() && incident.getResolvedAt() == null);
            if (flagged || response.riskLevel() == RiskLevel.HIGH || response.riskLevel() == RiskLevel.BREACHED) {
                result.add(response);
            }
        }
        result.sort(MOST_URGENT_FIRST);
        return result;
    }

    // The caller's own work queue, most urgent running SLA clock first. Technicians only.
    @Transactional(readOnly = true)
    public List<IncidentResponse> queue(String actorId) {
        User actor = findUser(actorId);
        if (!(actor instanceof Technician)) {
            throw new UnauthorizedActionException("Only technicians have a work queue");
        }
        List<IncidentResponse> result = new ArrayList<>();
        for (Incident incident : incidentRepository.findByAssignedTechnicianIdAndStatusIn(actorId, WORKING)) {
            result.add(IncidentResponse.from(incident));
        }
        result.sort(MOST_URGENT_FIRST);
        return result;
    }

    @Transactional(readOnly = true)
    public ImpactResponse impact(String incidentId, String actorId) {
        Incident incident = findIncident(incidentId);
        requireCanView(incident, findUser(actorId));
        ITService service = incident.getAffectedService();
        return ImpactResponse.from(service, impactAnalyzer.analyze(service, itServiceRepository.findAll()));
    }

    @Transactional(readOnly = true)
    public IncidentResponse get(String id, String actorId) {
        Incident incident = findIncident(id);
        requireCanView(incident, findUser(actorId));
        return IncidentResponse.from(incident);
    }

    @Transactional(readOnly = true)
    public List<IncidentResponse> list(IncidentStatus status, String actorId) {
        User actor = findUser(actorId);
        List<Incident> incidents;
        if (actor instanceof Employee) {
            incidents = (status == null)
                    ? incidentRepository.findByReporterId(actorId)
                    : incidentRepository.findByReporterIdAndStatus(actorId, status);
        } else {
            incidents = (status == null)
                    ? incidentRepository.findAll()
                    : incidentRepository.findByStatus(status);
        }

        List<IncidentResponse> result = new ArrayList<>();
        for (Incident incident : incidents) {
            result.add(IncidentResponse.from(incident));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public PageResponse<IncidentResponse> search(IncidentSearchCriteria criteria, Pageable pageable, String actorId) {
        if (criteria.from() != null && criteria.to() != null && !criteria.from().isBefore(criteria.to())) {
            throw new IllegalArgumentException("'from' must be before 'to'");
        }
        for (Sort.Order order : pageable.getSort()) {
            if (!SORTABLE_FIELDS.contains(order.getProperty())) {
                throw new IllegalArgumentException("Cannot sort by '" + order.getProperty()
                        + "'. Allowed: " + SORTABLE_FIELDS);
            }
        }
        if (findUser(actorId) instanceof Employee) {
            criteria = criteria.withReporterId(actorId); // whatever reporterId was sent, employees see only their own
        }
        Page<Incident> page = incidentRepository.findAll(IncidentSpecifications.matching(criteria), pageable);
        return PageResponse.from(page, IncidentResponse::from);
    }

    @Transactional
    public IncidentResponse classify(String incidentId, ClassifyRequest request, String actorId) {
        Incident incident = findIncident(incidentId);
        User admin = findUser(actorId);
        int before = incident.getAuditTrail().size();
        incident.classify(request.priority(), admin);
        incident.startSla(findPolicy(request.priority()));
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse assign(String incidentId, AssignRequest request, String actorId) {
        Incident incident = findIncident(incidentId);
        Technician tech = findTechnician(request.technicianId());
        User admin = findUser(actorId);
        int before = incident.getAuditTrail().size();
        incident.assignTo(tech, admin);
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse acknowledge(String incidentId, String actorId) {
        Incident incident = findIncident(incidentId);
        Technician tech = findTechnician(actorId);
        int before = incident.getAuditTrail().size();
        incident.acknowledge(tech);
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse startWork(String incidentId, String actorId) {
        Incident incident = findIncident(incidentId);
        Technician tech = findTechnician(actorId);
        int before = incident.getAuditTrail().size();
        incident.startWork(tech);
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse addNote(String incidentId, AddNoteRequest request, String actorId) {
        Incident incident = findIncident(incidentId);
        Technician tech = findTechnician(actorId);
        int before = incident.getAuditTrail().size();
        incident.addNote(tech, request.text());
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse resolve(String incidentId, ResolveRequest request, String actorId) {
        Incident incident = findIncident(incidentId);
        Technician tech = findTechnician(actorId);
        int before = incident.getAuditTrail().size();
        incident.resolve(tech, request.resolutionDetails());
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }

    // The comment goes through the domain, which checks the caller is the reporter and the incident is unfinished.
    @Transactional
    public IncidentResponse addComment(String incidentId, AddNoteRequest request, String actorId) {
        Incident incident = findIncident(incidentId);
        Employee employee = findEmployee(actorId);
        int before = incident.getAuditTrail().size();
        incident.addReporterComment(employee, request.text());
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse requestInfo(String incidentId, RequestInfoRequest request, String actorId) {
        Incident incident = findIncident(incidentId);
        Technician tech = findTechnician(actorId);
        int before = incident.getAuditTrail().size();
        incident.requestInfo(tech, request.question());
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }

    // feedback may be null: verifying without a body means no rating and no comment.
    @Transactional
    public IncidentResponse verify(String incidentId, VerifyRequest feedback, String actorId) {
        Incident incident = findIncident(incidentId);
        Employee employee = findEmployee(actorId);
        int before = incident.getAuditTrail().size();
        Integer rating = (feedback == null) ? null : feedback.rating();
        String comment = (feedback == null) ? null : feedback.comment();
        incident.verify(employee, rating, comment);
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse close(String incidentId, String actorId) {
        Incident incident = findIncident(incidentId);
        User actor = findUser(actorId);
        // The domain lets any user close, so the "reporter or admin" rule is checked here.
        if (actor instanceof Employee && !incident.getReporter().equals(actor)) {
            throw new UnauthorizedActionException("Only the reporter or an administrator can close this incident");
        }
        int before = incident.getAuditTrail().size();
        incident.close(actor);
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse reopen(String incidentId, ReopenRequest request, String actorId) {
        Incident incident = findIncident(incidentId);
        Employee employee = findEmployee(actorId);
        int before = incident.getAuditTrail().size();
        incident.reopen(employee, request.reason());
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse reassign(String incidentId, ReassignRequest request, String actorId) {
        Incident incident = findIncident(incidentId);
        Technician newTech = findTechnician(request.newTechnicianId());
        User admin = findUser(actorId);
        int before = incident.getAuditTrail().size();
        incident.reassign(newTech, admin);
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }
}
