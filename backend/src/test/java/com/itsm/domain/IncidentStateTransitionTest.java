package com.itsm.domain;

import com.itsm.domain.exception.InvalidStateTransitionException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

// The State pattern as a table: every status x every action (8 x 10 = 80 cases).
// A legal pair must reach the expected next status; every other pair must be refused
// with InvalidStateTransitionException and leave the incident unchanged.
class IncidentStateTransitionTest {

    // Everyone needed to perform any action on one incident.
    static final class Fixture {
        final Employee reporter = new Employee("U-EMP-S", "Reporter", "rep@test.local", "hash");
        final Administrator admin = new Administrator("U-ADM-S", "Admin", "adm@test.local", "hash");
        final Technician tech = new Technician("U-TEC-S1", "Tech One", "t1@test.local", "hash", 5);
        final Technician otherTech = new Technician("U-TEC-S2", "Tech Two", "t2@test.local", "hash", 5);
        final Incident incident = new Incident("INC-S", "State test", "description", reporter,
                new Category("NETWORK", "Network"), new ITService("Test Service", 2), Impact.MEDIUM, Urgency.MEDIUM);

        // Walks the incident along the normal lifecycle until it has the given status.
        Fixture at(IncidentStatus target) {
            for (IncidentStatus step : IncidentStatus.values()) {
                if (incident.getStatus() == target) {
                    return this;
                }
                switch (incident.getStatus()) {
                    case NEW -> incident.classify(Priority.P3, admin);
                    case CLASSIFIED -> incident.assignTo(tech, admin);
                    case ASSIGNED -> incident.acknowledge(tech);
                    case ACKNOWLEDGED -> incident.startWork(tech);
                    case IN_PROGRESS -> incident.resolve(tech, "fixed");
                    case RESOLVED -> incident.verify(reporter);
                    case VERIFIED -> incident.close(reporter);
                    case CLOSED -> throw new IllegalStateException("cannot go past CLOSED");
                }
            }
            assertEquals(target, incident.getStatus());
            return this;
        }
    }

    // Every public lifecycle method, called with arguments that are valid apart from the status.
    enum Action {
        CLASSIFY((f, i) -> i.classify(Priority.P2, f.admin)),
        ASSIGN((f, i) -> i.assignTo(f.otherTech, f.admin)),
        ACKNOWLEDGE((f, i) -> i.acknowledge(f.tech)),
        START_WORK((f, i) -> i.startWork(f.tech)),
        ADD_NOTE((f, i) -> i.addNote(f.tech, "a note")),
        RESOLVE((f, i) -> i.resolve(f.tech, "done")),
        VERIFY((f, i) -> i.verify(f.reporter)),
        CLOSE((f, i) -> i.close(f.admin)),
        REOPEN((f, i) -> i.reopen(f.reporter, "still broken")),
        REASSIGN((f, i) -> i.reassign(f.otherTech, f.admin));

        private final BiConsumer<Fixture, Incident> call;

        Action(BiConsumer<Fixture, Incident> call) {
            this.call = call;
        }

        void apply(Fixture fixture) {
            call.accept(fixture, fixture.incident);
        }
    }

    // The legal moves: status -> (action -> next status). Everything not listed is illegal.
    private static final Map<IncidentStatus, Map<Action, IncidentStatus>> LEGAL = new EnumMap<>(IncidentStatus.class);

    static {
        for (IncidentStatus status : IncidentStatus.values()) {
            LEGAL.put(status, new EnumMap<>(Action.class));
        }
        LEGAL.get(IncidentStatus.NEW).put(Action.CLASSIFY, IncidentStatus.CLASSIFIED);
        LEGAL.get(IncidentStatus.CLASSIFIED).put(Action.ASSIGN, IncidentStatus.ASSIGNED);
        LEGAL.get(IncidentStatus.ASSIGNED).put(Action.ACKNOWLEDGE, IncidentStatus.ACKNOWLEDGED);
        LEGAL.get(IncidentStatus.ASSIGNED).put(Action.REASSIGN, IncidentStatus.ASSIGNED);
        LEGAL.get(IncidentStatus.ACKNOWLEDGED).put(Action.START_WORK, IncidentStatus.IN_PROGRESS);
        LEGAL.get(IncidentStatus.ACKNOWLEDGED).put(Action.ADD_NOTE, IncidentStatus.ACKNOWLEDGED);
        LEGAL.get(IncidentStatus.ACKNOWLEDGED).put(Action.REASSIGN, IncidentStatus.ASSIGNED);
        LEGAL.get(IncidentStatus.IN_PROGRESS).put(Action.ADD_NOTE, IncidentStatus.IN_PROGRESS);
        LEGAL.get(IncidentStatus.IN_PROGRESS).put(Action.RESOLVE, IncidentStatus.RESOLVED);
        LEGAL.get(IncidentStatus.IN_PROGRESS).put(Action.REASSIGN, IncidentStatus.ASSIGNED);
        LEGAL.get(IncidentStatus.RESOLVED).put(Action.VERIFY, IncidentStatus.VERIFIED);
        LEGAL.get(IncidentStatus.RESOLVED).put(Action.REOPEN, IncidentStatus.IN_PROGRESS);
        LEGAL.get(IncidentStatus.VERIFIED).put(Action.CLOSE, IncidentStatus.CLOSED);
        // CLOSED: nothing is allowed.
    }

    static Stream<Arguments> legalPairs() {
        List<Arguments> pairs = new ArrayList<>();
        for (IncidentStatus status : IncidentStatus.values()) {
            for (Map.Entry<Action, IncidentStatus> move : LEGAL.get(status).entrySet()) {
                pairs.add(Arguments.of(status, move.getKey(), move.getValue()));
            }
        }
        return pairs.stream();
    }

    static Stream<Arguments> illegalPairs() {
        List<Arguments> pairs = new ArrayList<>();
        for (IncidentStatus status : IncidentStatus.values()) {
            for (Action action : Action.values()) {
                if (!LEGAL.get(status).containsKey(action)) {
                    pairs.add(Arguments.of(status, action));
                }
            }
        }
        return pairs.stream();
    }

    @ParameterizedTest(name = "{0} + {1} -> {2}")
    @MethodSource("legalPairs")
    void legalActionReachesTheNextStatus(IncidentStatus from, Action action, IncidentStatus expected) {
        Fixture fixture = new Fixture().at(from);
        int auditBefore = fixture.incident.getAuditTrail().size();

        action.apply(fixture);

        assertEquals(expected, fixture.incident.getStatus());
        assertEquals(auditBefore + 1, fixture.incident.getAuditTrail().size()); // every move is audited once
    }

    @ParameterizedTest(name = "{0} + {1} is refused")
    @MethodSource("illegalPairs")
    void illegalActionIsRefusedAndChangesNothing(IncidentStatus from, Action action) {
        Fixture fixture = new Fixture().at(from);
        int auditBefore = fixture.incident.getAuditTrail().size();

        InvalidStateTransitionException ex =
                assertThrows(InvalidStateTransitionException.class, () -> action.apply(fixture));

        assertEquals(from, ex.getFrom());
        assertEquals(from, fixture.incident.getStatus());
        assertEquals(auditBefore, fixture.incident.getAuditTrail().size());
    }

    // A note is not a status change, so the message names the refused action instead of a target.
    @Test
    void refusedNoteNamesTheAction() {
        Fixture fixture = new Fixture().at(IncidentStatus.CLOSED);

        InvalidStateTransitionException ex =
                assertThrows(InvalidStateTransitionException.class, () -> Action.ADD_NOTE.apply(fixture));

        assertEquals("Cannot add a note while the incident is CLOSED", ex.getMessage());
        assertNull(ex.getTo());
    }

    @Test
    void refusedStatusChangeNamesBothStatuses() {
        Fixture fixture = new Fixture().at(IncidentStatus.CLOSED);

        InvalidStateTransitionException ex =
                assertThrows(InvalidStateTransitionException.class, () -> Action.RESOLVE.apply(fixture));

        assertEquals("Cannot move incident from CLOSED to RESOLVED", ex.getMessage());
    }
}
