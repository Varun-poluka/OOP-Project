package com.itsm.service;

import com.itsm.domain.*;
import com.itsm.domain.event.*;
import com.itsm.domain.exception.ResourceNotFoundException;
import com.itsm.domain.exception.UnauthorizedActionException;
import com.itsm.domain.strategy.PriorityCalculator;
import com.itsm.dto.*;
import com.itsm.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
public class IncidentService {

    private static final Set<String> SORTABLE_FIELDS = Set.of("createdAt", "priority", "status", "title");

    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;
    private final TechnicianRepository technicianRepository;
    private final CategoryRepository categoryRepository;
    private final ITServiceRepository itServiceRepository;
    private final PriorityCalculator priorityCalculator;
    private final AssignmentStrategySelector strategySelector;
    private final IncidentEventPublisher eventPublisher;
    private final SLAPolicyRepository slaPolicyRepository;

    public IncidentService(IncidentRepository incidentRepository,
                           UserRepository userRepository,
                           TechnicianRepository technicianRepository,
                           CategoryRepository categoryRepository,
                           ITServiceRepository itServiceRepository,
                           PriorityCalculator priorityCalculator,
                           AssignmentStrategySelector strategySelector,
                           IncidentEventPublisher eventPublisher,
                           SLAPolicyRepository slaPolicyRepository) {
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
        Employee reporter = findReporter(request, findUser(actorId));

        String categoryName = request.categoryName().toUpperCase();
        Category category = categoryRepository.findById(categoryName)
                .orElseThrow(() -> new ResourceNotFoundException("Category", categoryName));

        ITService service = itServiceRepository.findById(request.serviceId())
                .orElseThrow(() -> new ResourceNotFoundException("Service", String.valueOf(request.serviceId())));

        Incident incident = new Incident(nextIncidentId(), request.title(), request.description(),
                reporter, category, service, request.impact(), request.urgency());

        Priority priority = priorityCalculator.calculate(request.impact(), request.urgency(), service.getBusinessCriticality());
        incident.classify(priority);
        incident.startSla(findPolicy(priority));

        List<Technician> candidates = technicianRepository.findByAvailableTrue();
        Optional<Technician> chosen = strategySelector.getCurrent().selectTechnician(incident, candidates);
        if(chosen.isPresent()){
            incident.assignTo(chosen.get());
        }

        Incident saved = incidentRepository.save(incident);
        eventPublisher.publishNewEvents(saved,0);
        return IncidentResponse.from(saved);
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

    @Transactional
    public IncidentResponse verify(String incidentId, String actorId) {
        Incident incident = findIncident(incidentId);
        Employee employee = findEmployee(actorId);
        int before = incident.getAuditTrail().size();
        incident.verify(employee);
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
