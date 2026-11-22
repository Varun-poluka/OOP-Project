package com.itsm.domain;
import com.itsm.domain.exception.UnauthorizedActionException;
import jakarta.persistence.*;

import java.time.Duration;
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
    // "boolean default false" lets ddl-auto=update add these columns to a table that already has rows.
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean responseAtRisk;
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean resolutionAtRisk;

    // Set while the technician waits for an answer from the reporter (the question itself).
    // A flag beside the status, not a lifecycle state: asking does not move the incident.
    @Column(length = 2000)
    private String pendingInfoRequest;
    private LocalDateTime infoRequestedAt;
    // Optional feedback the reporter gives when verifying the fix.
    private Integer feedbackRating;
    @Column(length = 2000)
    private String feedbackComment;

    public static final int MIN_RATING = 1;
    public static final int MAX_RATING = 5;

    // A running SLA clock is "at risk" once this share of its window has been used.
    public static final double RISK_THRESHOLD = 0.75;

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

    // Leading indicator: warns before a breach. Like checkSla, each flag is set at most once.
    public boolean checkSlaRisk(LocalDateTime now){
        if (responseDueAt == null || resolutionDueAt == null) {
            return false;
        }
        if (now == null) {
            throw new NullPointerException("now is required");
        }
        boolean changed = false;
        if(!responseAtRisk && !responseBreached && acknowledgedAt == null && windowUsed(responseDueAt, now) >= RISK_THRESHOLD){
            responseAtRisk = true;
            auditTrail.add(new AuditRecord(null, "SLA_RESPONSE_AT_RISK", null, null, "Response due by " + responseDueAt));
            changed = true;
        }
        if(!resolutionAtRisk && !resolutionBreached && resolvedAt == null && windowUsed(resolutionDueAt, now) >= RISK_THRESHOLD){
            resolutionAtRisk = true;
            auditTrail.add(new AuditRecord(null, "SLA_RESOLUTION_AT_RISK", null, null, "Resolution due by " + resolutionDueAt));
            changed = true;
        }
        return changed;
    }

    // Share of the window createdAt -> dueAt that has passed at 'now' (can exceed 1.0).
    private double windowUsed(LocalDateTime dueAt, LocalDateTime now){
        long window = Duration.between(createdAt, dueAt).toSeconds();
        if (window <= 0) {
            return 1.0;
        }
        return (double) Duration.between(createdAt, now).toSeconds() / window;
    }

    // An audit-only entry from the system (actor SYSTEM, no status change), e.g. PRIORITY_RAISED.
    public void recordSystemEvent(String action, String description){
        if (action == null || action.isBlank()) {
            throw new IllegalArgumentException("action is required");
        }
        auditTrail.add(new AuditRecord(null, action, null, null, description));
    }

    // Test-only hook: the lifecycle always stamps LocalDateTime.now(), so unit tests use this
    // to place events at chosen times. Package-private, so services and controllers cannot call it.
    void overrideTimestampsForTest(LocalDateTime createdAt, LocalDateTime acknowledgedAt, LocalDateTime resolvedAt) {
        if (createdAt == null) {
            throw new NullPointerException("createdAt is required");
        }
        this.createdAt = createdAt;
        this.acknowledgedAt = acknowledgedAt;
        this.resolvedAt = resolvedAt;
    }

    // actor is null when the system classifies automatically; the audit trail then shows SYSTEM.
    void applyClassify(Priority priority, User actor) {
        if (priority == null) {
            throw new NullPointerException("Priority is required");
        }
        this.priority = priority;
        changeStatus(actor, IncidentStatus.CLASSIFIED, "CLASSIFIED", "Priority set to: " + priority);
    }

    // actor is null for automatic assignment by the strategy; the audit trail then shows SYSTEM.
    void applyAssign(Technician tech, User actor) {
        if (tech == null) {
            throw new NullPointerException("Technician is required");
        }
        tech.addIncident();
        this.assignedTechnician = tech;
        changeStatus(actor, IncidentStatus.ASSIGNED, "ASSIGNED", "Assigned to " + tech.getName());
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

    private void requireReporter(Employee employee, String what){
        if(employee == null){
            throw new NullPointerException("Employee is required");
        }
        if(!employee.equals(reporter)){
            throw new UnauthorizedActionException("Only the reporter of the incident can " + what);
        }
    }

    // A comment from the reporter is stored with the notes. If the technician asked a question,
    // this comment is the answer: the request is cleared and the audit says INFO_PROVIDED.
    void applyAddReporterComment(Employee employee, String text){
        requireReporter(employee, "add a comment");
        InvestigationNote note = new InvestigationNote(employee, text); // validates the text
        notes.add(note);
        if(pendingInfoRequest != null){
            pendingInfoRequest = null;
            infoRequestedAt = null;
            auditTrail.add(new AuditRecord(employee, "INFO_PROVIDED", null, null, note.getText()));
        }
        else{
            auditTrail.add(new AuditRecord(employee, "COMMENT_ADDED", null, null, note.getText()));
        }
    }

    // The question is also kept as a technician note, so the notes read as a conversation.
    void applyRequestInfo(Technician tech, String question){
        requireAssignedTechnician(tech);
        if(pendingInfoRequest != null){
            throw new IllegalStateException("A question is already waiting for the reporter's answer");
        }
        InvestigationNote note = new InvestigationNote(tech, question); // validates the text
        notes.add(note);
        pendingInfoRequest = note.getText();
        infoRequestedAt = LocalDateTime.now();
        auditTrail.add(new AuditRecord(tech, "INFO_REQUESTED", null, null, note.getText()));
    }

    void applyResolve(Technician tech, String details){
        requireAssignedTechnician(tech);
        if(details == null || details.isBlank()){
            throw new IllegalArgumentException("Resolution details Required");
        }
        tech.removeIncident();
        // A question nobody answered no longer matters once the problem is fixed.
        this.pendingInfoRequest = null;
        this.infoRequestedAt = null;
        this.resolutionDetails = details.trim();
        this.resolvedAt = LocalDateTime.now();
        changeStatus(tech, IncidentStatus.RESOLVED, "RESOLVED",this.resolutionDetails);
    }

    // rating and comment are optional; a rating, if given, must be 1-5.
    void applyVerify(Employee employee, Integer rating, String comment){
        if(employee == null){
            throw new NullPointerException("Employee is required");
        }
        if(!employee.equals(reporter)){
            throw new UnauthorizedActionException("Only the reporter of the Incident can verify");
        }
        if(rating != null && (rating < MIN_RATING || rating > MAX_RATING)){
            throw new IllegalArgumentException("Rating must be between " + MIN_RATING + " and " + MAX_RATING);
        }
        String trimmed = (comment == null || comment.isBlank()) ? null : comment.trim();
        changeStatus(employee, IncidentStatus.VERIFIED, "VERIFIED", "Verified by: " + employee.getName());
        if(rating != null || trimmed != null){
            this.feedbackRating = rating;
            this.feedbackComment = trimmed;
            String stars = (rating == null) ? "No rating" : "Rated " + rating + "/" + MAX_RATING;
            auditTrail.add(new AuditRecord(employee, "FEEDBACK_GIVEN", null, null,
                    (trimmed == null) ? stars : stars + ": " + trimmed));
        }
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
        classify(priority, null);
    }

    public void classify(Priority priority, User actor){
        state().classify(this, priority, actor);
    }

    public void assignTo(Technician tech){
        assignTo(tech, null);
    }

    public void assignTo(Technician tech, User actor){
        state().assign(this, tech, actor);
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
        verify(employee, null, null);
    }

    public void verify(Employee employee, Integer rating, String comment){
        state().verify(this, employee, rating, comment);
    }

    public void addReporterComment(Employee employee, String text){
        state().addReporterComment(this, employee, text);
    }

    public void requestInfo(Technician tech, String question){
        state().requestInfo(this, tech, question);
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

    public boolean isResponseAtRisk() {
        return responseAtRisk;
    }

    public boolean isResolutionAtRisk() {
        return resolutionAtRisk;
    }

    public String getPendingInfoRequest() {
        return pendingInfoRequest;
    }

    public boolean isInfoRequested() {
        return pendingInfoRequest != null;
    }

    public LocalDateTime getInfoRequestedAt() {
        return infoRequestedAt;
    }

    public Integer getFeedbackRating() {
        return feedbackRating;
    }

    public String getFeedbackComment() {
        return feedbackComment;
    }
}
