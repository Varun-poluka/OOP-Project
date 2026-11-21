package com.itsm.domain;

class ClassifiedState extends IncidentState {
    @Override
    IncidentStatus getStatus(){
        return IncidentStatus.CLASSIFIED;
    }

    @Override
    void assign(Incident incident, Technician tech, User actor){
        incident.applyAssign(tech, actor);
    }
}
