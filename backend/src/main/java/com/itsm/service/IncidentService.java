package com.itsm.service;

import com.itsm.domain.*;
import com.itsm.domain.event.*;
import com.itsm.domain.exception.ResourceNotFoundException;
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

    // ===== 4.3 Use cases =====

    @Transactional
    public IncidentResponse report(CreateIncidentRequest request) {
        Employee reporter = findEmployee(request.reporterId());

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
    public IncidentResponse get(String id) {
        return IncidentResponse.from(findIncident(id));
    }

    @Transactional(readOnly = true)
    public List<IncidentResponse> list(IncidentStatus status) {
        List<Incident> incidents = (status == null)
                ? incidentRepository.findAll()
                : incidentRepository.findByStatus(status);

        List<IncidentResponse> result = new ArrayList<>();
        for (Incident incident : incidents) {
            result.add(IncidentResponse.from(incident));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public PageResponse<IncidentResponse> search(IncidentSearchCriteria criteria, Pageable pageable) {
        if (criteria.from() != null && criteria.to() != null && !criteria.from().isBefore(criteria.to())) {
            throw new IllegalArgumentException("'from' must be before 'to'");
        }
        for (Sort.Order order : pageable.getSort()) {
            if (!SORTABLE_FIELDS.contains(order.getProperty())) {
                throw new IllegalArgumentException("Cannot sort by '" + order.getProperty()
                        + "'. Allowed: " + SORTABLE_FIELDS);
            }
        }
        Page<Incident> page = incidentRepository.findAll(IncidentSpecifications.matching(criteria), pageable);
        return PageResponse.from(page, IncidentResponse::from);
    }

    @Transactional
    public IncidentResponse classify(String incidentId, ClassifyRequest request) {
        Incident incident = findIncident(incidentId);
        int before = incident.getAuditTrail().size();
        incident.classify(request.priority());
        incident.startSla(findPolicy(request.priority()));
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse assign(String incidentId, TechnicianActionRequest request) {
        Incident incident = findIncident(incidentId);
        int before = incident.getAuditTrail().size();
        incident.assignTo(findTechnician(request.technicianId()));
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse acknowledge(String incidentId, TechnicianActionRequest request) {
        Incident incident = findIncident(incidentId);
        int before = incident.getAuditTrail().size();
        incident.acknowledge(findTechnician(request.technicianId()));
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse startWork(String incidentId, TechnicianActionRequest request) {
        Incident incident = findIncident(incidentId);
        int before = incident.getAuditTrail().size();
        incident.startWork(findTechnician(request.technicianId()));
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse addNote(String incidentId, AddNoteRequest request) {
        Incident incident = findIncident(incidentId);
        int before = incident.getAuditTrail().size();
        incident.addNote(findTechnician(request.technicianId()), request.text());
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse resolve(String incidentId, ResolveRequest request) {
        Incident incident = findIncident(incidentId);
        int before = incident.getAuditTrail().size();
        incident.resolve(findTechnician(request.technicianId()), request.resolutionDetails());
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse verify(String incidentId, VerifyRequest request) {
        Incident incident = findIncident(incidentId);
        int before = incident.getAuditTrail().size();
        incident.verify(findEmployee(request.employeeId()));
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse close(String incidentId, CloseRequest request) {
        Incident incident = findIncident(incidentId);
        int before = incident.getAuditTrail().size();
        incident.close(findUser(request.userId()));
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse reopen(String incidentId, ReopenRequest request) {
        Incident incident = findIncident(incidentId);
        int before = incident.getAuditTrail().size();
        incident.reopen(findEmployee(request.employeeId()), request.reason());
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse reassign(String incidentId, ReassignRequest request) {
        Incident incident = findIncident(incidentId);
        int before = incident.getAuditTrail().size();
        incident.reassign(findTechnician(request.newTechnicianId()), findUser(request.actorId()));
        eventPublisher.publishNewEvents(incident, before);
        return IncidentResponse.from(incident);
    }
}