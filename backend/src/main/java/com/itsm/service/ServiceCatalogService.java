package com.itsm.service;

import com.itsm.domain.ITService;
import com.itsm.domain.IncidentStatus;
import com.itsm.domain.exception.ResourceNotFoundException;
import com.itsm.dto.CreateServiceRequest;
import com.itsm.dto.ImpactResponse;
import com.itsm.dto.ServiceResponse;
import com.itsm.repository.ITServiceRepository;
import com.itsm.repository.IncidentRepository;
import com.itsm.service.intelligence.ServiceImpactAnalyzer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

// The IT service catalogue and its dependency graph.
@Service
public class ServiceCatalogService {

    private static final List<IncidentStatus> FINISHED =
            List.of(IncidentStatus.RESOLVED, IncidentStatus.VERIFIED, IncidentStatus.CLOSED);

    private final ITServiceRepository itServiceRepository;
    private final IncidentRepository incidentRepository;
    private final ServiceImpactAnalyzer analyzer;

    public ServiceCatalogService(ITServiceRepository itServiceRepository, IncidentRepository incidentRepository,
                                 ServiceImpactAnalyzer analyzer) {
        this.itServiceRepository = itServiceRepository;
        this.incidentRepository = incidentRepository;
        this.analyzer = analyzer;
    }

    private ITService findService(Long id) {
        return itServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service", String.valueOf(id)));
    }

    private ServiceResponse toResponse(ITService service) {
        return ServiceResponse.from(service,
                incidentRepository.countByAffectedServiceIdAndStatusNotIn(service.getId(), FINISHED));
    }

    @Transactional(readOnly = true)
    public List<ServiceResponse> list() {
        List<ITService> services = new ArrayList<>(itServiceRepository.findAll());
        services.sort(Comparator.comparing(ITService::getName));
        List<ServiceResponse> result = new ArrayList<>();
        for (ITService service : services) {
            result.add(toResponse(service));
        }
        return List.copyOf(result);
    }

    @Transactional(readOnly = true)
    public ImpactResponse impact(Long serviceId) {
        ITService service = findService(serviceId);
        return ImpactResponse.from(service, analyzer.analyze(service, itServiceRepository.findAll()));
    }

    @Transactional
    public ServiceResponse create(CreateServiceRequest request) {
        String name = request.name().trim();
        if (itServiceRepository.findByName(name).isPresent()) {
            throw new IllegalArgumentException("A service named '" + name + "' already exists");
        }
        // Check, then change: load every dependency before creating anything.
        List<ITService> dependencies = new ArrayList<>();
        if (request.dependsOnIds() != null) {
            for (Long id : request.dependsOnIds()) {
                dependencies.add(findService(id));
            }
        }
        ITService service = new ITService(name, request.businessCriticality());
        for (ITService dependency : dependencies) {
            service.addDependency(dependency);
        }
        return toResponse(itServiceRepository.save(service));
    }

    @Transactional
    public ServiceResponse addDependency(Long serviceId, Long dependsOnId) {
        ITService service = findService(serviceId);
        ITService dependsOn = findService(dependsOnId);
        if (service.dependsOn(dependsOn)) {
            throw new IllegalArgumentException(service.getName() + " already depends on " + dependsOn.getName());
        }
        service.addDependency(dependsOn); // also rejects a service depending on itself
        return toResponse(service);
    }

    @Transactional
    public ServiceResponse removeDependency(Long serviceId, Long dependsOnId) {
        ITService service = findService(serviceId);
        ITService dependsOn = findService(dependsOnId);
        service.removeDependency(dependsOn);
        return toResponse(service);
    }
}
