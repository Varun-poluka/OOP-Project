package com.itsm.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;

@Entity
public class SLAPolicy {
    @Id
    @Enumerated(EnumType.STRING)
    private Priority priority;
    private int responseMinutes;
    private int resolutionMinutes;

    protected SLAPolicy() { }

    public SLAPolicy(Priority priority, int responseMinutes, int resolutionMinutes){
        if(priority == null){
            throw new NullPointerException("Priority required");
        }
        this.priority = priority;
        setTargets(responseMinutes, resolutionMinutes);
    }

    public void update(int responseMinutes, int resolutionMinutes){
        setTargets(responseMinutes, resolutionMinutes);
    }

    private void setTargets(int response, int resolution){
        if(response < 1){
            throw new IllegalArgumentException("Response time must be at least 1 minute");
        }
        if(resolution < response){
            throw new IllegalArgumentException("Resolution time cannot be shorter than response time");
        }
        this.responseMinutes = response;
        this.resolutionMinutes = resolution;
    }

    public Priority getPriority() {
        return priority;
    }

    public int getResponseMinutes() {
        return responseMinutes;
    }

    public int getResolutionMinutes() {
        return resolutionMinutes;
    }
}
