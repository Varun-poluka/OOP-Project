package com.itsm.domain;

class AssignedState extends IncidentState {
    @Override
    IncidentStatus getStatus(){
        return IncidentStatus.ASSIGNED;
    }

    @Override
    void acknowledge(Incident incident, Technician tech){
        incident.applyAcknowledge(tech);
    }
}
