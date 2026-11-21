package com.itsm.controller;

import com.itsm.domain.IncidentStatus;
import com.itsm.dto.*;
import com.itsm.service.IncidentService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Every method takes the caller from the verified JWT (@AuthenticationPrincipal), never from the body.
// Which roles may call which URL is decided in SecurityConfig.
@RestController
@RequestMapping("/api/incidents")
public class IncidentController {
    private final IncidentService incidentService;

    public IncidentController(IncidentService incidentService) {
        this.incidentService = incidentService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public IncidentResponse report(@Valid @RequestBody CreateIncidentRequest request,
                                   @AuthenticationPrincipal Jwt jwt) {
        return incidentService.report(request, jwt.getSubject());
    }

    @GetMapping("/search")
    public PageResponse<IncidentResponse> search(
            IncidentSearchCriteria criteria,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal Jwt jwt) {
        return incidentService.search(criteria, pageable, jwt.getSubject());
    }

    @GetMapping("/{id}")
    public IncidentResponse get(@PathVariable String id, @AuthenticationPrincipal Jwt jwt) {
        return incidentService.get(id, jwt.getSubject());
    }

    @GetMapping
    public List<IncidentResponse> list(@RequestParam(required = false) IncidentStatus status,
                                       @AuthenticationPrincipal Jwt jwt) {
        return incidentService.list(status, jwt.getSubject());
    }

    @PatchMapping("/{id}/acknowledge")
    public IncidentResponse acknowledge(@PathVariable String id, @AuthenticationPrincipal Jwt jwt) {
        return incidentService.acknowledge(id, jwt.getSubject());
    }

    @PatchMapping("/{id}/classify")
    public IncidentResponse classify(@PathVariable String id, @Valid @RequestBody ClassifyRequest request,
                                     @AuthenticationPrincipal Jwt jwt) {
        return incidentService.classify(id, request, jwt.getSubject());
    }

    @PatchMapping("/{id}/assign")
    public IncidentResponse assign(@PathVariable String id, @Valid @RequestBody AssignRequest request,
                                   @AuthenticationPrincipal Jwt jwt) {
        return incidentService.assign(id, request, jwt.getSubject());
    }

    @PatchMapping("/{id}/start")
    public IncidentResponse startWork(@PathVariable String id, @AuthenticationPrincipal Jwt jwt) {
        return incidentService.startWork(id, jwt.getSubject());
    }

    @PostMapping("/{id}/notes")
    public IncidentResponse addNote(@PathVariable String id, @Valid @RequestBody AddNoteRequest request,
                                    @AuthenticationPrincipal Jwt jwt) {
        return incidentService.addNote(id, request, jwt.getSubject());
    }

    @PatchMapping("/{id}/resolve")
    public IncidentResponse resolve(@PathVariable String id, @Valid @RequestBody ResolveRequest request,
                                    @AuthenticationPrincipal Jwt jwt) {
        return incidentService.resolve(id, request, jwt.getSubject());
    }

    @PatchMapping("/{id}/verify")
    public IncidentResponse verify(@PathVariable String id, @AuthenticationPrincipal Jwt jwt) {
        return incidentService.verify(id, jwt.getSubject());
    }

    @PatchMapping("/{id}/close")
    public IncidentResponse close(@PathVariable String id, @AuthenticationPrincipal Jwt jwt) {
        return incidentService.close(id, jwt.getSubject());
    }

    @PatchMapping("/{id}/reopen")
    public IncidentResponse reopen(@PathVariable String id, @Valid @RequestBody ReopenRequest request,
                                   @AuthenticationPrincipal Jwt jwt) {
        return incidentService.reopen(id, request, jwt.getSubject());
    }

    @PatchMapping("/{id}/reassign")
    public IncidentResponse reassign(@PathVariable String id, @Valid @RequestBody ReassignRequest request,
                                     @AuthenticationPrincipal Jwt jwt) {
        return incidentService.reassign(id, request, jwt.getSubject());
    }
}
