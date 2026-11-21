package com.itsm.dto;

import com.itsm.domain.AuditRecord;
import com.itsm.domain.Impact;
import com.itsm.domain.Incident;
import com.itsm.domain.IncidentStatus;
import com.itsm.domain.InvestigationNote;
import com.itsm.domain.Priority;
import com.itsm.domain.Technician;
import com.itsm.domain.Urgency;
import com.itsm.service.intelligence.RiskLevel;
import com.itsm.service.intelligence.SlaRisk;
import com.itsm.service.intelligence.SlaRiskAssessor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public record IncidentResponse(
        String id,
        String title,
        String description,
        IncidentStatus status,
        Priority priority,
        Impact impact,
        Urgency urgency,
        String categoryName,
        String serviceName,
        String reporterId,
        String reporterName,
        String assignedTechnicianId,
        String assignedTechnicianName,
        String resolutionDetails,
        LocalDateTime createdAt,
        LocalDateTime acknowledgedAt,
        LocalDateTime resolvedAt,
        LocalDateTime closedAt,
        LocalDateTime responseDueAt,
        LocalDateTime resolutionDueAt,
        boolean responseBreached,
        boolean resolutionBreached,
        boolean responseAtRisk,
        boolean resolutionAtRisk,
        // Computed when the response is built, from the most urgent running SLA clock.
        RiskLevel riskLevel,
        Integer slaPercentUsed,
        List<NoteResponse> notes,
        List<AuditRecordResponse> auditTrail,
        // Filled only in the response to POST /api/incidents; empty everywhere else.
        List<DuplicateCandidateResponse> possibleDuplicates
) {
    public static IncidentResponse from(Incident incident) {
        Technician tech = incident.getAssignedTechnician();
        String technicianId = (tech == null) ? null : tech.getId();
        String technicianName = (tech == null) ? null : tech.getName();

        List<NoteResponse> notes = new ArrayList<NoteResponse>();
        for (InvestigationNote note : incident.getNotes()) {
            notes.add(NoteResponse.from(note));
        }

        SlaRisk risk = SlaRiskAssessor.assess(incident, LocalDateTime.now());

        List<AuditRecordResponse> auditTrail = new ArrayList<AuditRecordResponse>();
        for (AuditRecord record : incident.getAuditTrail()) {
            auditTrail.add(AuditRecordResponse.from(record));
        }

        return new IncidentResponse(
                incident.getId(),
                incident.getTitle(),
                incident.getDescription(),
                incident.getStatus(),
                incident.getPriority(),
                incident.getImpact(),
                incident.getUrgency(),
                incident.getCategory().getName(),
                incident.getAffectedService().getName(),
                incident.getReporter().getId(),
                incident.getReporter().getName(),
                technicianId,
                technicianName,
                incident.getResolutionDetails(),
                incident.getCreatedAt(),
                incident.getAcknowledgedAt(),
                incident.getResolvedAt(),
                incident.getClosedAt(),
                incident.getResponseDueAt(),
                incident.getResolutionDueAt(),
                incident.isResponseBreached(),
                incident.isResolutionBreached(),
                incident.isResponseAtRisk(),
                incident.isResolutionAtRisk(),
                risk.level(),
                risk.percentUsed(),
                Collections.unmodifiableList(notes),
                Collections.unmodifiableList(auditTrail),
                List.of());
    }

    // Records are immutable, so this returns a copy with the duplicates filled in.
    public IncidentResponse withPossibleDuplicates(List<DuplicateCandidateResponse> duplicates) {
        return new IncidentResponse(id, title, description, status, priority, impact, urgency, categoryName,
                serviceName, reporterId, reporterName, assignedTechnicianId, assignedTechnicianName,
                resolutionDetails, createdAt, acknowledgedAt, resolvedAt, closedAt, responseDueAt,
                resolutionDueAt, responseBreached, resolutionBreached, responseAtRisk, resolutionAtRisk,
                riskLevel, slaPercentUsed, notes, auditTrail, List.copyOf(duplicates));
    }
}
