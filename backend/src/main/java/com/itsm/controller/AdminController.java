package com.itsm.controller;

import com.itsm.domain.Priority;
import com.itsm.dto.ChangeStrategyRequest;
import com.itsm.dto.SlaCheckResponse;
import com.itsm.dto.SlaPolicyResponse;
import com.itsm.dto.StrategyResponse;
import com.itsm.dto.UpdateSlaPolicyRequest;
import com.itsm.service.AssignmentStrategySelector;
import com.itsm.service.SlaService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AssignmentStrategySelector selector;
    private final SlaService slaService;

    public AdminController(AssignmentStrategySelector selector, SlaService slaService) {
        this.selector = selector;
        this.slaService = slaService;
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
        int breaches = slaService.checkAll(checkedAt);
        return new SlaCheckResponse(checkedAt, breaches);
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
