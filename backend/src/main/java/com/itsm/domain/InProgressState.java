package com.itsm.domain;

class InProgressState extends IncidentState {
    @Override
    IncidentStatus getStatus(){
        return IncidentStatus.IN_PROGRESS;
    }

    @Override
    void addNote(Incident incident, Technician tech, String text){
        incident.applyAddNote(tech,text);
    }

    @Override
    void resolve(Incident incident, Technician tech, String details){
        incident.applyResolve(tech, details);
    }
}
