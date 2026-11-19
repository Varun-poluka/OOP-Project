package com.itsm.service;

import com.itsm.domain.Incident;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static com.itsm.domain.IncidentTestData.incident;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

// Plain JUnit: no Spring context and no database. Response target is 60 min, resolution 240 min.
class ReportCalculatorTest {

    private static final LocalDateTime T0 = LocalDateTime.of(2026, 1, 1, 9, 0);

    @Test
    void emptyListGivesNullEverywhere() {
        List<Incident> none = List.of();
        assertNull(ReportCalculator.responseCompliance(none));
        assertNull(ReportCalculator.resolutionCompliance(none));
        assertNull(ReportCalculator.meanMinutesToAcknowledge(none));
        assertNull(ReportCalculator.meanMinutesToResolve(none));
    }

    @Test
    void acknowledgedOnTimeIsCompliant() {
        Incident onTime = incident(T0, true, T0.plusMinutes(30), null);
        assertEquals(100.0, ReportCalculator.responseCompliance(List.of(onTime)));
    }

    @Test
    void acknowledgedExactlyAtDeadlineIsCompliant() {
        Incident atDeadline = incident(T0, true, T0.plusMinutes(60), null);
        assertEquals(100.0, ReportCalculator.responseCompliance(List.of(atDeadline)));
    }

    @Test
    void acknowledgedLateIsNotCompliant() {
        Incident late = incident(T0, true, T0.plusMinutes(90), null);
        assertEquals(0.0, ReportCalculator.responseCompliance(List.of(late)));
    }

    @Test
    void notYetDueIsExcluded() {
        Incident pending = incident(T0, true, null, null);
        assertNull(ReportCalculator.responseCompliance(List.of(pending)));
        assertNull(ReportCalculator.resolutionCompliance(List.of(pending)));
    }

    @Test
    void breachedAndNeverAcknowledgedIsNotCompliant() {
        Incident breached = incident(T0, true, null, null);
        breached.checkSla(T0.plusMinutes(61));
        assertEquals(0.0, ReportCalculator.responseCompliance(List.of(breached)));
        // The resolution deadline has not passed yet, so resolution is still undecided.
        assertNull(ReportCalculator.resolutionCompliance(List.of(breached)));
    }

    @Test
    void incidentWithoutSlaIsExcluded() {
        Incident noSla = incident(T0, false, T0.plusMinutes(10), T0.plusMinutes(50));
        assertNull(ReportCalculator.responseCompliance(List.of(noSla)));
        assertNull(ReportCalculator.resolutionCompliance(List.of(noSla)));
    }

    @Test
    void onlyDecidedIncidentsCountInTheDenominator() {
        List<Incident> incidents = List.of(
                incident(T0, true, T0.plusMinutes(30), null),   // met
                incident(T0, true, T0.plusMinutes(90), null),   // missed
                incident(T0, true, null, null),                 // not yet due: excluded
                incident(T0, false, T0.plusMinutes(5), null));  // no SLA: excluded
        assertEquals(50.0, ReportCalculator.responseCompliance(incidents));
    }

    @Test
    void resolutionComplianceUsesResolvedAt() {
        List<Incident> incidents = List.of(
                incident(T0, true, T0.plusMinutes(10), T0.plusMinutes(200)),  // met
                incident(T0, true, T0.plusMinutes(10), T0.plusMinutes(300))); // missed
        assertEquals(50.0, ReportCalculator.resolutionCompliance(incidents));
    }

    @Test
    void meanMinutesToAcknowledgeAveragesOnlyAcknowledgedIncidents() {
        List<Incident> incidents = List.of(
                incident(T0, true, T0.plusMinutes(10), null),
                incident(T0, true, T0.plusMinutes(30), null),
                incident(T0, true, null, null));
        assertEquals(20.0, ReportCalculator.meanMinutesToAcknowledge(incidents));
    }

    @Test
    void meanMinutesToResolveAveragesOnlyResolvedIncidents() {
        List<Incident> incidents = List.of(
                incident(T0, true, T0.plusMinutes(10), T0.plusMinutes(100)),
                incident(T0, true, T0.plusMinutes(10), T0.plusMinutes(200)),
                incident(T0, true, T0.plusMinutes(10), null));
        assertEquals(150.0, ReportCalculator.meanMinutesToResolve(incidents));
    }

    @Test
    void meanMinutesToResolveIsNullWhenNothingResolved() {
        Incident open = incident(T0, true, T0.plusMinutes(10), null);
        assertNull(ReportCalculator.meanMinutesToResolve(List.of(open)));
    }
}
