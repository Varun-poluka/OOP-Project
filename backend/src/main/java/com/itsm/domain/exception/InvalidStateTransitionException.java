package com.itsm.domain.exception;

import com.itsm.domain.IncidentStatus;

public class InvalidStateTransitionException extends RuntimeException{
    private final IncidentStatus from;
    private final IncidentStatus to;

    public InvalidStateTransitionException(IncidentStatus from, IncidentStatus to){
        super("Cannot move incident from " + from + " to " + to);
        this.from = from;
        this.to = to;
    }

    // For a refused action that would not change the status (e.g. adding a note), so the
    // message names the action: "Cannot add a note while the incident is CLOSED".
    public InvalidStateTransitionException(IncidentStatus from, String action){
        super("Cannot " + action + " while the incident is " + from);
        this.from = from;
        this.to = null;
    }

    public IncidentStatus getFrom(){
        return from;
    }
    // null when the refused action was not a status change
    public IncidentStatus getTo(){
        return to;
    }
}
