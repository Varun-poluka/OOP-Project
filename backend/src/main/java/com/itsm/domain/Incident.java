package com.itsm.domain;
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
    private LocalDateTime responseDueAt;
    private LocalDateTime resolutionDueAt;
    private boolean responseBreached;
    private boolean resolutionBreached;

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

    private void changeStatus(User actor, IncidentStatus newStatus, String action, String description){
        auditTrail.add(new AuditRecord(actor, action, this.status, newStatus, description));
        this.status = newStatus;
    }

    private void requireAssignedTechnician(Technician tech){
        if(tech == null  || !tech.equals(assignedTechnician)){
            throw new UnauthorizedActionException("Only assigned technician can do this");
        }
    }

    public void startSla(SLAPolicy policy){
        if(policy == null){
            throw new NullPointerException("SLA Policy is required");
        }
        if(this.priority == null){
            throw new IllegalStateException("Incident must be classified before its SLA can start");
        }
        if(policy.getPriority() != this.priority){
            throw new IllegalArgumentException("SLA policy " + policy.getPriority() + " does not match incident priority " + priority);
        }
        responseDueAt = createdAt.plusMinutes(policy.getResponseMinutes());
        resolutionDueAt = createdAt.plusMinutes(policy.getResolutionMinutes());
    }

    public boolean checkSla(LocalDateTime now){
        if (responseDueAt == null || resolutionDueAt == null) {
            return false; // incident predates SLA tracking, so there is nothing to check
        }
        boolean changed = false;
        if(!responseBreached && acknowledgedAt == null && now.isAfter(responseDueAt)){
            responseBreached = true;
            auditTrail.add(new AuditRecord(null, "SLA_RESPONSE_BREACHED", null, null, "Not Acknowledged by " + responseDueAt));
            changed = true;
        }
        if(!resolutionBreached && resolvedAt == null && now.isAfter(resolutionDueAt)){
            resolutionBreached = true;
            auditTrail.add(new AuditRecord(null, "SLA_RESOLUTION_BREACHED", null, null, "Not resolved by " + resolutionDueAt));
            changed = true;
        }
        return changed;
    }

    void applyClassify(Priority priority) {
        if (priority == null) {
            throw new NullPointerException("Priority is required");
        }
        this.priority = priority;
        changeStatus(null, IncidentStatus.CLASSIFIED, "CLASSIFIED", "Priority set to: " + priority);
    }

    void applyAssign(Technician tech) {
        if (tech == null) {
            throw new NullPointerException("Technician is required");
        }
        tech.addIncident();
        this.assignedTechnician = tech;
        changeStatus(null, IncidentStatus.ASSIGNED, "ASSIGNED", "Assigned to " + tech.getName());
    }

    void applyAcknowledge(Technician tech){
        requireAssignedTechnician(tech);
        acknowledgedAt = LocalDateTime.now();
        changeStatus(tech, IncidentStatus.ACKNOWLEDGED, "ACKNOWLEDGED", tech.getName() + " Acknowledged");

    }

    void applyStartWork(Technician tech){
        requireAssignedTechnician(tech);
        changeStatus(tech, IncidentStatus.IN_PROGRESS, "STARTED", tech.getName() + " Has started the work");
    }

    void applyAddNote(Technician tech, String text){
        requireAssignedTechnician(tech);
        notes.add(new InvestigationNote(tech, text));
        auditTrail.add(new AuditRecord(tech, "NOTE_ADDED", null, null, text));
    }

    void applyResolve(Technician tech, String details){
        requireAssignedTechnician(tech);
        if(details == null || details.isBlank()){
            throw new IllegalArgumentException("Resolution details Required");
        }
        tech.removeIncident();
        this.resolutionDetails = details.trim();
        this.resolvedAt = LocalDateTime.now();
        changeStatus(tech, IncidentStatus.RESOLVED, "RESOLVED",this.resolutionDetails);
    }

    void applyVerify(Employee employee){
        if(employee == null){
            throw new NullPointerException("Employee is required");
        }
        if(!employee.equals(reporter)){
            throw new UnauthorizedActionException("Only the reporter of the Incident can verify");
        }
        changeStatus(employee, IncidentStatus.VERIFIED, "VERIFIED", "Verified by: " + employee.getName());
    }

    void applyClose(User actor){
        if(actor == null){
            throw new NullPointerException("User is required to close");
        }
        this.closedAt = LocalDateTime.now();
        changeStatus(actor, IncidentStatus.CLOSED, "CLOSED", "Incident closed by: " + actor.getName());
    }

    private IncidentState state(){
        return IncidentStates.of(status);
    }

    public void classify(Priority priority){
        state().classify(this, priority);
    }

    public void assignTo(Technician tech){
        state().assign(this, tech);
    }

    public void acknowledge(Technician tech){
        state().acknowledge(this,tech);
    }

    public void startWork(Technician tech){
        state().startWork(this,tech);
    }

    public void addNote(Technician tech, String text){
        state().addNote(this,tech,text);
    }

    public void resolve(Technician tech, String details){
        state().resolve(this,tech,details);
    }

    public void verify(Employee employee){
        state().verify(this,employee);
    }

    public void close(User actor){
        state().close(this,actor);
    }

    public void reopen(Employee employee, String reason){
        state().reopen(this,employee,reason);
    }

    public void reassign(Technician newTech, User actor){
        state().reassign(this, newTech, actor);
    }

    void applyReopen(Employee employee, String reason) {
        if (employee == null) {
            throw new NullPointerException("Employee is required");
        }
        if (employee != reporter) {
            throw new UnauthorizedActionException("Only the reporter can reopen");
        }
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("A reason is required to reopen");
        }
        assignedTechnician.addIncident();
        this.resolutionDetails = null;
        this.resolvedAt = null;

        changeStatus(employee, IncidentStatus.IN_PROGRESS, "REOPENED", "Reopened: " + reason.trim());
    }

    void applyReassign(Technician newTech, User actor){
        if(actor == null){
            throw new NullPointerException("User is required");
        }
        if(!(actor instanceof Administrator)){
            throw new UnauthorizedActionException("Only an administrator can reassign");
        }
        if(newTech == null){
            throw new NullPointerException("Technician si required");
        }
        if(newTech.equals(assignedTechnician)){
            throw new IllegalArgumentException("Incident already assigned to " + newTech.getName());
        }
        newTech.addIncident();
        assignedTechnician.removeIncident();
        String previous = assignedTechnician.getName();
        assignedTechnician = newTech;
        acknowledgedAt = null;
        changeStatus(actor, IncidentStatus.ASSIGNED, "REASSIGNED", "Reassigned from " + previous + " to " + newTech.getName());
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

    public LocalDateTime getResponseDueAt() {
        return responseDueAt;
    }

    public LocalDateTime getResolutionDueAt() {
        return resolutionDueAt;
    }

    public boolean isResponseBreached() {
        return responseBreached;
    }

    public boolean isResolutionBreached() {
        return resolutionBreached;
    }
}

