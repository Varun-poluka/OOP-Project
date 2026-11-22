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
