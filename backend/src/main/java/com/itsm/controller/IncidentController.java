package com.itsm.controller;

import com.itsm.domain.IncidentStatus;
import com.itsm.dto.*;
import com.itsm.service.IncidentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/incidents")

public class IncidentController {
    private final IncidentService incidentService;

    public IncidentController(IncidentService incidentService) {
        this.incidentService = incidentService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public IncidentResponse report(@Valid @RequestBody CreateIncidentRequest request) {
        return incidentService.report(request);
    }

    @GetMapping("/{id}")
    public IncidentResponse get(@PathVariable String id) {
        return incidentService.get(id);
    }

    @GetMapping
    public List<IncidentResponse> list(@RequestParam(required = false) IncidentStatus status) {
        return incidentService.list(status);
    }

    @PatchMapping("/{id}/acknowledge")
    public IncidentResponse acknowledge(@PathVariable String id,
                                        @Valid @RequestBody TechnicianActionRequest request) {
        return incidentService.acknowledge(id, request);
    }

    @PatchMapping("/{id}/classify")
    public IncidentResponse classify(@PathVariable String id, @Valid @RequestBody ClassifyRequest request){
        return incidentService.classify(id,request);
    }

    @PatchMapping("/{id}/assign")
    public IncidentResponse assign(@PathVariable String id, @Valid @RequestBody TechnicianActionRequest request){
        return incidentService.assign(id,request);
    }

    @PatchMapping("/{id}/start")
    public IncidentResponse startWork(@PathVariable String id, @Valid @RequestBody TechnicianActionRequest request){
        return incidentService.startWork(id,request);
    }

    @PostMapping("/{id}/notes")
    public IncidentResponse addNote(@PathVariable String id, @Valid @RequestBody AddNoteRequest request){
        return incidentService.addNote(id,request);
    }

    @PatchMapping("/{id}/resolve")
    public IncidentResponse resolve(@PathVariable String id, @Valid @RequestBody ResolveRequest request){
        return incidentService.resolve(id,request);
    }

    @PatchMapping("/{id}/verify")
    public IncidentResponse verify(@PathVariable String id, @Valid @RequestBody VerifyRequest request){
        return incidentService.verify(id,request);
    }

    @PatchMapping("/{id}/close")
    public IncidentResponse close(@PathVariable String id, @Valid @RequestBody CloseRequest request){
        return incidentService.close(id,request);
    }
}
