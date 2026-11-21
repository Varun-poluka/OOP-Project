package com.itsm.controller;

import com.itsm.domain.IncidentStatus;
import com.itsm.dto.*;
import com.itsm.service.DuplicateService;
import com.itsm.service.IncidentService;
import com.itsm.service.RecommendationService;
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
    private final DuplicateService duplicateService;
    private final RecommendationService recommendationService;

    public IncidentController(IncidentService incidentService, DuplicateService duplicateService,
                              RecommendationService recommendationService) {
        this.incidentService = incidentService;
        this.duplicateService = duplicateService;
        this.recommendationService = recommendationService;
    }

    // Called by the report form before submitting; never stores anything.
    @PostMapping("/duplicates/check")
    public List<DuplicateCandidateResponse> checkDuplicates(@Valid @RequestBody DuplicateCheckRequest request,
                                                            @AuthenticationPrincipal Jwt jwt) {
        return duplicateService.check(request, jwt.getSubject());
    }

    // Literal paths like /at-risk win over the /{id} pattern, so this does not clash with get().
    @GetMapping("/at-risk")
    public List<IncidentResponse> atRisk(@AuthenticationPrincipal Jwt jwt) {
        return incidentService.atRisk(jwt.getSubject());
    }

    @GetMapping("/queue")
    public List<IncidentResponse> queue(@AuthenticationPrincipal Jwt jwt) {
        return incidentService.queue(jwt.getSubject());
    }

    @GetMapping("/{id}/recommendations")
    public List<TechnicianRecommendationResponse> recommendations(@PathVariable String id) {
        return recommendationService.recommend(id);
    }

    @GetMapping("/{id}/impact")
    public ImpactResponse impact(@PathVariable String id, @AuthenticationPrincipal Jwt jwt) {
        return incidentService.impact(id, jwt.getSubject());
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
