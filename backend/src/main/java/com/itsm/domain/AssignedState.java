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

    @Override
    void reassign(Incident incident, Technician newTech, User actor){
        incident.applyReassign(newTech, actor);
    }

    @Override
    void addReporterComment(Incident incident, Employee employee, String text){
        incident.applyAddReporterComment(employee, text);
    }
}
