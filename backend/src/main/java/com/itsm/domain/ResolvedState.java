package com.itsm.domain;

class ResolvedState extends IncidentState {
    @Override
    IncidentStatus getStatus(){
        return IncidentStatus.RESOLVED;
    }

    @Override
    void verify(Incident incident, Employee employee, Integer rating, String comment){
        incident.applyVerify(employee, rating, comment);
    }

    @Override
    void reopen(Incident incident, Employee employee, String reason){
        incident.applyReopen(employee, reason);
    }
}
