package com.itsm.controller;

import com.itsm.dto.ChangeStrategyRequest;
import com.itsm.dto.StrategyResponse;
import com.itsm.service.AssignmentStrategySelector;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AssignmentStrategySelector selector;

    public AdminController(AssignmentStrategySelector selector) {
        this.selector = selector;
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

    private StrategyResponse toResponse() {
        return new StrategyResponse(selector.getCurrent().getName(), selector.getAvailable());
    }
}
