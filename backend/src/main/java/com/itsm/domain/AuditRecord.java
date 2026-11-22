package com.itsm.domain;
import java.time.LocalDateTime;
import jakarta.persistence.*;

@Entity
public class AuditRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDateTime timestamp;
    @ManyToOne
    private User actor;
    private String action;
    @Enumerated(EnumType.STRING)
    private IncidentStatus previousStatus;
    @Enumerated(EnumType.STRING)
    private IncidentStatus newStatus;
    @Column(length = 2000)
    private String description;
    // Read-only view of the join column that Incident.auditTrail writes. Lets the audit log
    // filter by incident without a link back to Incident. Null until the incident is saved.
    @Column(name = "incident_id", insertable = false, updatable = false)
    private String incidentId;

    protected AuditRecord(){ }

    AuditRecord(User actor, String action, IncidentStatus previousStatus, IncidentStatus newStatus, String description){
        if(action == null || action.isBlank()){
            throw new IllegalArgumentException("Action is required");
        }
        this.action = action.trim();
        this.actor = actor;
        this.previousStatus = previousStatus;
        this.newStatus = newStatus;
        this.timestamp = LocalDateTime.now();
        this.description = description;
    }

    public Long getId(){
        return id;
    }
    public String getAction(){
        return action;
    }
    public User getActor(){
        return actor;
    }
    public LocalDateTime getTimestamp() {
        return timestamp;
    }
    public IncidentStatus getPreviousStatus(){
        return previousStatus;
    }
    public IncidentStatus getNewStatus(){
        return newStatus;
    }
    public String getDescription() {
        return description;
    }
    public String getIncidentId() {
        return incidentId;
    }

    @Override
    public String toString(){
        if(actor != null){
            return (timestamp.toLocalTime().withNano(0) + " " + getActor() + " " + getAction() + " " + getDescription());
        }
        else{
            return (timestamp.toLocalTime().withNano(0) + " SYSTEM " + getAction() + " " + getDescription());
        }
    }
}
