package com.itsm.domain;

import com.itsm.domain.exception.UnauthorizedActionException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Reporter comments, the technician's request for information, and feedback when verifying.
// Which statuses allow them is covered by IncidentStateTransitionTest; this checks the rules inside.
class IncidentReporterInteractionTest {

    private final Employee reporter = new Employee("U-EMP-R", "Reporter", "rep@test.local", "hash");
    private final Employee stranger = new Employee("U-EMP-X", "Stranger", "x@test.local", "hash");
    private final Technician tech = new Technician("U-TEC-R1", "Tech One", "t1@test.local", "hash", 5);
    private final Technician otherTech = new Technician("U-TEC-R2", "Tech Two", "t2@test.local", "hash", 5);
    private final Incident incident = new Incident("INC-R", "Printer jam", "description", reporter,
            new Category("HARDWARE", "Hardware"), new ITService("Printing", 1), Impact.LOW, Urgency.LOW);

    private void startWork() {
        incident.classify(Priority.P4);
        incident.assignTo(tech);
        incident.acknowledge(tech);
        incident.startWork(tech);
    }

    private String lastAction() {
        List<AuditRecord> trail = incident.getAuditTrail();
        return trail.get(trail.size() - 1).getAction();
    }

    @Test
    void reporterCommentIsStoredAsANoteMarkedFromTheReporter() {
        incident.addReporterComment(reporter, "  It happens on the second floor too  ");

        InvestigationNote note = incident.getNotes().get(0);
        assertTrue(note.isFromReporter());
        assertEquals(reporter, note.getAuthor());
        assertEquals("It happens on the second floor too", note.getText());
        assertEquals("COMMENT_ADDED", lastAction());
    }

    @Test
    void onlyTheReporterCanComment() {
        assertThrows(UnauthorizedActionException.class, () -> incident.addReporterComment(stranger, "me too"));
        assertTrue(incident.getNotes().isEmpty());
    }

    @Test
    void blankCommentIsRejectedAndNothingIsAudited() {
        int before = incident.getAuditTrail().size();
        assertThrows(IllegalArgumentException.class, () -> incident.addReporterComment(reporter, "   "));
        assertEquals(before, incident.getAuditTrail().size());
    }

    @Test
    void technicianNotesAreNotFromTheReporter() {
        startWork();
        incident.addNote(tech, "checked the cable");
        assertFalse(incident.getNotes().get(0).isFromReporter());
    }

    @Test
    void requestInfoSetsThePendingQuestionAndKeepsItAsANote() {
        startWork();
        incident.requestInfo(tech, "Which printer model?");

        assertTrue(incident.isInfoRequested());
        assertEquals("Which printer model?", incident.getPendingInfoRequest());
        assertEquals("Which printer model?", incident.getNotes().get(0).getText());
        assertEquals("INFO_REQUESTED", lastAction());
        assertEquals(IncidentStatus.IN_PROGRESS, incident.getStatus()); // no new lifecycle state
    }

    @Test
    void onlyTheAssignedTechnicianCanRequestInfo() {
        startWork();
        assertThrows(UnauthorizedActionException.class, () -> incident.requestInfo(otherTech, "Which model?"));
        assertFalse(incident.isInfoRequested());
    }

    @Test
    void aSecondQuestionWaitsForTheFirstAnswer() {
        startWork();
        incident.requestInfo(tech, "Which model?");
        assertThrows(IllegalStateException.class, () -> incident.requestInfo(tech, "And which room?"));
        assertEquals("Which model?", incident.getPendingInfoRequest());
    }

    @Test
    void reporterCommentAnswersTheQuestion() {
        startWork();
        incident.requestInfo(tech, "Which model?");
        int before = incident.getAuditTrail().size();

        incident.addReporterComment(reporter, "HP LaserJet 4000");

        assertFalse(incident.isInfoRequested());
        assertNull(incident.getInfoRequestedAt());
        assertEquals(before + 1, incident.getAuditTrail().size()); // one record, not COMMENT_ADDED as well
        assertEquals("INFO_PROVIDED", lastAction());
    }

    @Test
    void resolvingClearsAnUnansweredQuestion() {
        startWork();
        incident.requestInfo(tech, "Which model?");
        incident.resolve(tech, "Replaced the fuser");
        assertFalse(incident.isInfoRequested());
    }

    @Test
    void verifyWithFeedbackStoresAndAuditsIt() {
        startWork();
        incident.resolve(tech, "Replaced the fuser");

        incident.verify(reporter, 4, "  Quick fix  ");

        assertEquals(IncidentStatus.VERIFIED, incident.getStatus());
        assertEquals(4, incident.getFeedbackRating());
        assertEquals("Quick fix", incident.getFeedbackComment());
        assertEquals("FEEDBACK_GIVEN", lastAction());
        assertEquals("Rated 4/5: Quick fix", incident.getAuditTrail().get(incident.getAuditTrail().size() - 1).getDescription());
    }

    @Test
    void verifyWithoutFeedbackAddsNoFeedbackRecord() {
        startWork();
        incident.resolve(tech, "Replaced the fuser");

        incident.verify(reporter, null, "   ");

        assertEquals("VERIFIED", lastAction());
        assertNull(incident.getFeedbackRating());
        assertNull(incident.getFeedbackComment());
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 6, -1})
    void ratingOutsideOneToFiveIsRefusedBeforeAnythingChanges(int rating) {
        startWork();
        incident.resolve(tech, "Replaced the fuser");
        int before = incident.getAuditTrail().size();

        assertThrows(IllegalArgumentException.class, () -> incident.verify(reporter, rating, null));

        assertEquals(IncidentStatus.RESOLVED, incident.getStatus());
        assertEquals(before, incident.getAuditTrail().size());
        assertNull(incident.getFeedbackRating());
    }
}
