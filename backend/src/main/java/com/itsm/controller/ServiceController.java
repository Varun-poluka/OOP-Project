package com.itsm.controller;

import com.itsm.dto.CreateServiceRequest;
import com.itsm.dto.ImpactResponse;
import com.itsm.dto.ServiceResponse;
import com.itsm.service.ServiceCatalogService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// The IT service catalogue and its dependency graph. Role rules are in SecurityConfig.
@RestController
@RequestMapping("/api/services")
public class ServiceController {
    private final ServiceCatalogService catalogService;

    public ServiceController(ServiceCatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping
    public List<ServiceResponse> list() {
        return catalogService.list();
    }

    @GetMapping("/{id}/impact")
    public ImpactResponse impact(@PathVariable Long id) {
        return catalogService.impact(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceResponse create(@Valid @RequestBody CreateServiceRequest request) {
        return catalogService.create(request);
    }

    // {id} depends on {dependsOnId}: an outage of dependsOnId will impact id.
    @PostMapping("/{id}/dependencies/{dependsOnId}")
    public ServiceResponse addDependency(@PathVariable Long id, @PathVariable Long dependsOnId) {
        return catalogService.addDependency(id, dependsOnId);
    }

    @DeleteMapping("/{id}/dependencies/{dependsOnId}")
    public ServiceResponse removeDependency(@PathVariable Long id, @PathVariable Long dependsOnId) {
        return catalogService.removeDependency(id, dependsOnId);
    }
}
