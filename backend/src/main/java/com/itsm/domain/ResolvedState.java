package com.itsm.domain;

class ResolvedState extends IncidentState {
    @Override
    IncidentStatus getStatus(){
        return IncidentStatus.RESOLVED;
    }

    @Override
    void verify(Incident incident, Employee employee){
        incident.applyVerify(employee);
    }

    @Override
    void reopen(Incident incident, Employee employee, String reason){
        incident.applyReopen(employee, reason);
    }
}
