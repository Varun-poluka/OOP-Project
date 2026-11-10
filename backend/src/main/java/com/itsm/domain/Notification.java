package com.itsm.domain;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(optional = false)
    User recipient;
    String incidentId;
    @Column(length = 500)
    String message;
    @Column(name = "is_read")
    boolean read;
    LocalDateTime createdAt;

    protected Notification(){ }

    public Notification(User recipient, String incidentId, String message){
        if(recipient == null){
            throw new NullPointerException("Need an recipient");
        }
        this.recipient = recipient;
        if(message == null || message.isBlank()){
            throw new IllegalArgumentException("Message cannot be blank");
        }
        this.message = message;
        read = false;
        createdAt = LocalDateTime.now();
    }

    public void markAsRead(){
        read = true;
    }

    public Long getId() {
        return id;
    }

    public User getRecipient() {
        return recipient;
    }

    public String getIncidentId() {
        return incidentId;
    }

    public boolean isRead() {
        return read;
    }

    public String getMessage() {
        return message;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
