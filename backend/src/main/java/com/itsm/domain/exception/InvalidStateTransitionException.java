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

    public IncidentStatus getFrom(){
        return from;
    }
    public IncidentStatus getTo(){
        return to;
    }
}
