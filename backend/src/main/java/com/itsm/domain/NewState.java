package com.itsm.domain;

class NewState extends IncidentState {
    @Override
    IncidentStatus getStatus(){
        return IncidentStatus.NEW;
    }

    @Override
    void classify(Incident incident, Priority priority){
        incident.applyClassify(priority);
    }
}
