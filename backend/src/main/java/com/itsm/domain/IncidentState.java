package com.itsm.domain;
import com.itsm.domain.exception.InvalidStateTransitionException;

abstract class IncidentState {
    abstract IncidentStatus getStatus();

    void classify(Incident incident, Priority priority, User actor){
        throw refuse(IncidentStatus.CLASSIFIED);
    }

    void assign(Incident incident, Technician tech, User actor){
        throw refuse(IncidentStatus.ASSIGNED);
    }

    void acknowledge(Incident incident, Technician tech) {
        throw refuse(IncidentStatus.ACKNOWLEDGED);
    }

    void startWork(Incident incident, Technician tech) {
        throw refuse(IncidentStatus.IN_PROGRESS);
    }

    // A note does not change the status, so the refused "target" is the current status.
    void addNote(Incident incident, Technician tech, String text) {
        throw refuse(getStatus());
    }

    void resolve(Incident incident, Technician tech, String details) {
        throw refuse(IncidentStatus.RESOLVED);
    }

    void verify(Incident incident, Employee employee) {
        throw refuse(IncidentStatus.VERIFIED);
    }

    void close(Incident incident, User actor) {
        throw refuse(IncidentStatus.CLOSED);
    }

    void reopen(Incident incident, Employee employee, String reason) {
        throw refuse(IncidentStatus.IN_PROGRESS);
    }

    void reassign(Incident incident, Technician newTech, User actor) {
        throw refuse(IncidentStatus.ASSIGNED);
    }

    protected InvalidStateTransitionException refuse(IncidentStatus target) {
        return new InvalidStateTransitionException(getStatus(), target);
    }
}
