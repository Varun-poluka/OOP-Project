package com.itsm.dto;

import com.itsm.domain.AuditRecord;
import com.itsm.domain.Impact;
import com.itsm.domain.Incident;
import com.itsm.domain.IncidentStatus;
import com.itsm.domain.InvestigationNote;
import com.itsm.domain.Priority;
import com.itsm.domain.Technician;
import com.itsm.domain.Urgency;

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
        List<NoteResponse> notes,
        List<AuditRecordResponse> auditTrail
) {
    public static IncidentResponse from(Incident incident) {
        Technician tech = incident.getAssignedTechnician();
        String technicianId = (tech == null) ? null : tech.getId();
        String technicianName = (tech == null) ? null : tech.getName();

        List<NoteResponse> notes = new ArrayList<NoteResponse>();
        for (InvestigationNote note : incident.getNotes()) {
            notes.add(NoteResponse.from(note));
        }

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
                Collections.unmodifiableList(notes),
                Collections.unmodifiableList(auditTrail));
    }
}
