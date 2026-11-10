package com.itsm.service;

import com.itsm.domain.*;
import com.itsm.domain.exception.ResourceNotFoundException;
import com.itsm.dto.*;
import com.itsm.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;
    private final TechnicianRepository technicianRepository;
    private final CategoryRepository categoryRepository;
    private final ITServiceRepository itServiceRepository;

    public IncidentService(IncidentRepository incidentRepository,
                           UserRepository userRepository,
                           TechnicianRepository technicianRepository,
                           CategoryRepository categoryRepository,
                           ITServiceRepository itServiceRepository) {
        this.incidentRepository = incidentRepository;
        this.userRepository = userRepository;
        this.technicianRepository = technicianRepository;
        this.categoryRepository = categoryRepository;
        this.itServiceRepository = itServiceRepository;
    }
    // ===== 4.2 Private helpers =====

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

        Incident saved = incidentRepository.save(incident);
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

    @Transactional
    public IncidentResponse classify(String incidentId, ClassifyRequest request) {
        Incident incident = findIncident(incidentId);
        incident.classify(request.priority());
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse assign(String incidentId, TechnicianActionRequest request) {
        Incident incident = findIncident(incidentId);
        incident.assignTo(findTechnician(request.technicianId()));
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse acknowledge(String incidentId, TechnicianActionRequest request) {
        Incident incident = findIncident(incidentId);
        incident.acknowledge(findTechnician(request.technicianId()));
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse startWork(String incidentId, TechnicianActionRequest request) {
        Incident incident = findIncident(incidentId);
        incident.startWork(findTechnician(request.technicianId()));
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse addNote(String incidentId, AddNoteRequest request) {
        Incident incident = findIncident(incidentId);
        incident.addNote(findTechnician(request.technicianId()), request.text());
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse resolve(String incidentId, ResolveRequest request) {
        Incident incident = findIncident(incidentId);
        incident.resolve(findTechnician(request.technicianId()), request.resolutionDetails());
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse verify(String incidentId, VerifyRequest request) {
        Incident incident = findIncident(incidentId);
        incident.verify(findEmployee(request.employeeId()));
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse close(String incidentId, CloseRequest request) {
        Incident incident = findIncident(incidentId);
        incident.close(findUser(request.userId()));
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse reopen(String incidentId, ReopenRequest request) {
        Incident incident = findIncident(incidentId);
        incident.reopen(findEmployee(request.employeeId()), request.reason());
        return IncidentResponse.from(incident);
    }

    @Transactional
    public IncidentResponse reassign(String incidentId, ReassignRequest request) {
        Incident incident = findIncident(incidentId);
        incident.reassign(findTechnician(request.newTechnicianId()), findUser(request.actorId()));
        return IncidentResponse.from(incident);
    }
}