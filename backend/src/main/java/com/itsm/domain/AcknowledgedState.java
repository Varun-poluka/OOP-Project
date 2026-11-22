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

    @Override
    void reassign(Incident incident, Technician newTech, User actor){
        incident.applyReassign(newTech, actor);
    }

    @Override
    void addReporterComment(Incident incident, Employee employee, String text){
        incident.applyAddReporterComment(employee, text);
    }

    @Override
    void requestInfo(Incident incident, Technician tech, String question){
        incident.applyRequestInfo(tech, question);
    }
}
