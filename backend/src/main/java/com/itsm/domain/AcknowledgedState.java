package com.itsm.domain;

class AcknowledgedState extends IncidentState {
    @Override
    IncidentStatus getStatus(){
        return IncidentStatus.ACKNOWLEDGED;
    }

    @Override
    void startWork(Incident incident, Technician tech){
        incident.applyStartWork(tech);
    }

    @Override
    void addNote(Incident incident, Technician tech, String text){
        incident.applyAddNote(tech,text);
    }
}
