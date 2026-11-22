package com.itsm.domain;

class NewState extends IncidentState {
    @Override
    IncidentStatus getStatus(){
        return IncidentStatus.NEW;
    }

    @Override
    void classify(Incident incident, Priority priority, User actor){
        incident.applyClassify(priority, actor);
    }

    @Override
    void addReporterComment(Incident incident, Employee employee, String text){
        incident.applyAddReporterComment(employee, text);
    }
}
