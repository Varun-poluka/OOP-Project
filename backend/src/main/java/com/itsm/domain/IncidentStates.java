package com.itsm.domain;

final class IncidentStates {
    private static final IncidentState NEW_STATE = new NewState();
    private static final IncidentState CLASSIFIED_STATE = new ClassifiedState();
    private static final IncidentState ASSIGNED_STATE = new AssignedState();
    private static final IncidentState ACKNOWLEDGED_STATE = new AcknowledgedState();
    private static final IncidentState IN_PROGRESS_STATE = new InProgressState();
    private static final IncidentState RESOLVED_STATE = new ResolvedState();
    private static final IncidentState VERIFIED_STATE = new VerifiedState();
    private static final IncidentState CLOSED_STATE = new ClosedState();

    private IncidentStates() { }

    static IncidentState of(IncidentStatus status) {
        return switch (status) {
            case NEW -> NEW_STATE;
            case CLASSIFIED -> CLASSIFIED_STATE;
            case ASSIGNED -> ASSIGNED_STATE;
            case ACKNOWLEDGED -> ACKNOWLEDGED_STATE;
            case IN_PROGRESS -> IN_PROGRESS_STATE;
            case RESOLVED -> RESOLVED_STATE;
            case VERIFIED -> VERIFIED_STATE;
            case CLOSED -> CLOSED_STATE;
        };
    }
}
