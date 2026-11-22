package com.itsm.controller;

import com.itsm.domain.Priority;
import com.itsm.dto.AuditLogCriteria;
import com.itsm.dto.AuditLogEntry;
import com.itsm.dto.CategoryResponse;
import com.itsm.dto.ChangeStrategyRequest;
import com.itsm.dto.CreateCategoryRequest;
import com.itsm.dto.CreateUserRequest;
import com.itsm.dto.PageResponse;
import com.itsm.dto.SlaCheckResponse;
import com.itsm.dto.SlaPolicyResponse;
import com.itsm.dto.StrategyResponse;
import com.itsm.dto.TechnicianResponse;
import com.itsm.dto.UpdateSlaPolicyRequest;
import com.itsm.dto.UpdateTechnicianRequest;
import com.itsm.dto.UserResponse;
import com.itsm.service.AdminUserService;
import com.itsm.service.AssignmentStrategySelector;
import com.itsm.service.AuditLogService;
import com.itsm.service.ReferenceDataService;
import com.itsm.service.SlaService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

// Everything under /api/admin is for administrators only (SecurityConfig).
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AssignmentStrategySelector selector;
    private final SlaService slaService;
    private final AdminUserService adminUserService;
    private final ReferenceDataService referenceDataService;
    private final AuditLogService auditLogService;

    public AdminController(AssignmentStrategySelector selector, SlaService slaService,
                           AdminUserService adminUserService, ReferenceDataService referenceDataService,
                           AuditLogService auditLogService) {
        this.selector = selector;
        this.slaService = slaService;
        this.adminUserService = adminUserService;
        this.referenceDataService = referenceDataService;
        this.auditLogService = auditLogService;
    }

    @GetMapping("/users")
    public List<UserResponse> users() {
        return adminUserService.list();
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse createUser(@Valid @RequestBody CreateUserRequest request) {
        return adminUserService.create(request);
    }

    // The caller comes from the token, so "you cannot deactivate yourself" can be checked.
    @PatchMapping("/users/{id}/deactivate")
    public UserResponse deactivate(@PathVariable String id, @AuthenticationPrincipal Jwt jwt) {
        return adminUserService.deactivate(id, jwt.getSubject());
    }

    @PatchMapping("/users/{id}/reactivate")
    public UserResponse reactivate(@PathVariable String id) {
        return adminUserService.reactivate(id);
    }

    @PutMapping("/technicians/{id}")
    public TechnicianResponse updateTechnician(@PathVariable String id,
                                               @Valid @RequestBody UpdateTechnicianRequest request) {
        return adminUserService.updateTechnician(id, request);
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryResponse createCategory(@Valid @RequestBody CreateCategoryRequest request) {
        return referenceDataService.createCategory(request);
    }

    // Filters come from the query string (?incidentId=&actorId=&action=&from=&to=), all optional.
    @GetMapping("/audit")
    public PageResponse<AuditLogEntry> audit(AuditLogCriteria criteria,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "25") int size) {
        return auditLogService.search(criteria, page, size);
    }

    @GetMapping("/assignment-strategy")
    public StrategyResponse getStrategy() {
        return toResponse();
    }

    @PutMapping("/assignment-strategy")
    public StrategyResponse changeStrategy(@Valid @RequestBody ChangeStrategyRequest request) {
        selector.setCurrent(request.strategy());
        return toResponse();
    }

    @PostMapping("/sla/check")
    public SlaCheckResponse checkSla(
            @RequestParam(name = "at", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime at) {
        LocalDateTime checkedAt = (at == null) ? LocalDateTime.now() : at;
        return slaService.checkAll(checkedAt);
    }

    @GetMapping("/sla/policies")
    public List<SlaPolicyResponse> getSlaPolicies() {
        return slaService.getPolicies();
    }

    @PutMapping("/sla/policies/{priority}")
    public SlaPolicyResponse updateSlaPolicy(@PathVariable Priority priority,
                                             @Valid @RequestBody UpdateSlaPolicyRequest request) {
        return slaService.updatePolicy(priority, request.responseMinutes(), request.resolutionMinutes());
    }

    private StrategyResponse toResponse() {
        return new StrategyResponse(selector.getCurrent().getName(), selector.getAvailable());
    }
}
