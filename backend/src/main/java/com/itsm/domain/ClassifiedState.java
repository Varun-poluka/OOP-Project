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

    @Override
    void addReporterComment(Incident incident, Employee employee, String text){
        incident.applyAddReporterComment(employee, text);
    }
}
