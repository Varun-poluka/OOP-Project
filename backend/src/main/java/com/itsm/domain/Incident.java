package com.itsm.domain;
import com.itsm.domain.exception.InvalidStateTransitionException;
import com.itsm.domain.exception.UnauthorizedActionException;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.*;

@Entity
public class Incident {

    @Id
    private String id;
    @Column(nullable = false)
    private String title;
    @Column(length = 2000)
    private String description;
    @ManyToOne(optional = false)
    private Employee reporter;
    @ManyToOne
    private Category category;
    @ManyToOne
    private ITService affectedService;
    @Enumerated(EnumType.STRING)
    private Impact impact;
    @Enumerated(EnumType.STRING)
    private Urgency urgency;
    @Enumerated(EnumType.STRING)
    private Priority priority;
    @Enumerated(EnumType.STRING)
    private IncidentStatus status;
    @ManyToOne
    private Technician assignedTechnician;
    @Column(length = 2000)
    private String resolutionDetails;
    private LocalDateTime createdAt;
    private LocalDateTime acknowledgedAt;
    private LocalDateTime resolvedAt;
    private LocalDateTime closedAt;
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "incident_id")
    @OrderBy("id")
    private List<InvestigationNote> notes = new ArrayList<InvestigationNote>();
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "incident_id")
    @OrderBy("id")
    private List<AuditRecord> auditTrail = new ArrayList<AuditRecord>();

    protected Incident(){}

    public Incident(String id, String title, String description, Employee reporter, Category category, ITService affectedService, Impact impact, Urgency urgency){
        if(id == null){
            throw new NullPointerException("ID is required");
        }
        if(reporter == null){
            throw new NullPointerException("reporter is required");
        }
        if(category == null){
            throw new NullPointerException("category of incident is required");
        }
        if(affectedService == null){
            throw new NullPointerException("affectedService is required");
        }
        if(impact == null){
            throw new NullPointerException("impact of the incident is required");
        }
        if(urgency == null){
            throw new NullPointerException("urgency of the incident has to be mentioned");
        }

        if(title == null || title.isBlank()){
            throw new IllegalArgumentException("title cannot be empty");
        }

        this.title = title.trim();
        this.id = id;
        this.description = description;
        this.reporter = reporter;
        this.category = category;
        this.affectedService = affectedService;
        this.impact = impact;
        this.urgency = urgency;
        this.status = IncidentStatus.NEW;
        this.createdAt = LocalDateTime.now();
        auditTrail.add(new AuditRecord(reporter, "CREATED", null, IncidentStatus.NEW, this.title));
    }

    private void requireStatus(IncidentStatus expected, IncidentStatus target){
        if(this.status != expected){
            throw new InvalidStateTransitionException(this.status, target);
        }
    }
    private void changeStatus(User actor, IncidentStatus newStatus, String action, String description){
        auditTrail.add(new AuditRecord(actor, action, this.status, newStatus, description));
        this.status = newStatus;
    }

    private void requireAssignedTechnician(Technician tech){
        if(tech == null  || !tech.equals(assignedTechnician)){
            throw new UnauthorizedActionException("Only assigned technician can do this");
        }
    }

    public void classify(Priority priority){
        requireStatus(IncidentStatus.NEW, IncidentStatus.CLASSIFIED);
        if(priority == null){
            throw new NullPointerException("Priority is required");
        }
        this.priority = priority;
        changeStatus(null, IncidentStatus.CLASSIFIED, "CLASSIFIED", "Priority set to: " + priority);
    }

    public void assignTo(Technician tech){
        requireStatus(IncidentStatus.CLASSIFIED, IncidentStatus.ASSIGNED);
        if(tech == null){
            throw new NullPointerException("Technician is required");
        }
        tech.addIncident();
        this.assignedTechnician = tech;
        changeStatus(null, IncidentStatus.ASSIGNED, "ASSIGNED", "Assigned to " + tech.getName());
    }

    public void acknowledge(Technician tech){
        requireStatus(IncidentStatus.ASSIGNED, IncidentStatus.ACKNOWLEDGED);
        requireAssignedTechnician(tech);
        acknowledgedAt = LocalDateTime.now();
        changeStatus(tech, IncidentStatus.ACKNOWLEDGED, "ACKNOWLEDGED", tech.getName() + " Acknowledged");

    }

    public void startWork(Technician tech){
        requireStatus(IncidentStatus.ACKNOWLEDGED, IncidentStatus.IN_PROGRESS);
        requireAssignedTechnician(tech);
        changeStatus(tech, IncidentStatus.IN_PROGRESS, "STARTED", tech.getName() + " Has started the work");
    }

    public void addNote(Technician tech, String text){
        if(this.status != IncidentStatus.ACKNOWLEDGED && this.status != IncidentStatus.IN_PROGRESS){
            throw new IllegalStateException("Notes can only be added while the incident is being worked on");
        }
        requireAssignedTechnician(tech);
        notes.add(new InvestigationNote(tech, text));
        auditTrail.add(new AuditRecord(tech, "NOTE ADDED", null, null, text));
    }

    public void resolve(Technician tech, String details){
        requireStatus(IncidentStatus.IN_PROGRESS, IncidentStatus.RESOLVED);
        requireAssignedTechnician(tech);
        if(details == null || details.isBlank()){
            throw new IllegalArgumentException("Resolution details Required");
        }
        tech.removeIncident();
        this.resolutionDetails = details.trim();
        this.resolvedAt = LocalDateTime.now();
        changeStatus(tech, IncidentStatus.RESOLVED, "RESOLVED",this.resolutionDetails);
    }

    public void verify(Employee employee){
        if(employee == null){
            throw new NullPointerException("Employee is required");
        }
        requireStatus(IncidentStatus.RESOLVED, IncidentStatus.VERIFIED);
        if(!employee.equals(reporter)){
            throw new UnauthorizedActionException("Only the reporter of the Incident can verify");
        }
        changeStatus(employee, IncidentStatus.VERIFIED, "VERIFIED", "Verified by: " + employee.getName());
    }

    public void close(User actor){
        requireStatus(IncidentStatus.VERIFIED, IncidentStatus.CLOSED);
        if(actor == null){
            throw new NullPointerException("User is required to close");
        }
        this.closedAt = LocalDateTime.now();
        changeStatus(actor, IncidentStatus.CLOSED, "CLOSED", "Incident closed by: " + actor.getName());
    }

    public String getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public Employee getReporter() {
        return reporter;
    }

    public Category getCategory() {
        return category;
    }

    public ITService getAffectedService() {
        return affectedService;
    }

    public Impact getImpact() {
        return impact;
    }

    public Urgency getUrgency() {
        return urgency;
    }

    public Priority getPriority() {
        return priority;
    }

    public IncidentStatus getStatus() {
        return status;
    }

    public Technician getAssignedTechnician() {
        return assignedTechnician;
    }

    public String getResolutionDetails() {
        return resolutionDetails;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getAcknowledgedAt() {
        return acknowledgedAt;
    }

    public LocalDateTime getResolvedAt() {
        return resolvedAt;
    }

    public LocalDateTime getClosedAt() {
        return closedAt;
    }

    public List<InvestigationNote> getNotes() {
        return Collections.unmodifiableList(notes);
    }

    public List<AuditRecord> getAuditTrail() {
        return Collections.unmodifiableList(auditTrail);
    }
}

