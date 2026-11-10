package com.itsm.domain;

class VerifiedState extends IncidentState {
    @Override
    IncidentStatus getStatus(){
        return IncidentStatus.VERIFIED;
    }

    @Override
    void close(Incident incident, User actor){
        incident.applyClose(actor);
    }
}
