package com.itsm.domain;

class ClosedState extends IncidentState {
    @Override
    IncidentStatus getStatus(){
        return IncidentStatus.CLOSED;
    }
}
