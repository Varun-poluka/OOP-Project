package com.itsm.service.intelligence;

import com.itsm.domain.Incident;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static com.itsm.domain.IncidentTestData.incident;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

// Response window 60 min, resolution window 240 min.
class SlaRiskAssessorTest {

    private static final LocalDateTime T0 = LocalDateTime.of(2026, 1, 1, 9, 0);

    @Test
    void noSlaIsNone() {
        SlaRisk risk = SlaRiskAssessor.assess(incident(T0, false, null, null), T0);
        assertEquals(RiskLevel.NONE, risk.level());
        assertNull(risk.percentUsed());
    }

    @Test
    void underHalfIsLow() {
        SlaRisk risk = SlaRiskAssessor.assess(incident(T0, true, null, null), T0.plusMinutes(29));
        assertEquals(RiskLevel.LOW, risk.level());
        assertEquals(48, risk.percentUsed());
    }

    @Test
    void halfIsMedium() {
        assertEquals(RiskLevel.MEDIUM, SlaRiskAssessor.assess(incident(T0, true, null, null), T0.plusMinutes(30)).level());
    }

    @Test
    void threeQuartersIsHigh() {
        SlaRisk risk = SlaRiskAssessor.assess(incident(T0, true, null, null), T0.plusMinutes(45));
        assertEquals(RiskLevel.HIGH, risk.level());
        assertEquals(75, risk.percentUsed());
    }

    @Test
    void mostUrgentRunningClockWins() {
        // At 40 min: response clock 67%, resolution clock 17%, so MEDIUM from the response clock.
        SlaRisk risk = SlaRiskAssessor.assess(incident(T0, true, null, null), T0.plusMinutes(40));
        assertEquals(RiskLevel.MEDIUM, risk.level());
        assertEquals(67, risk.percentUsed());
    }

    @Test
    void acknowledgedStopsTheResponseClock() {
        // At 40 min, acknowledged: only the resolution clock runs (17%).
        SlaRisk risk = SlaRiskAssessor.assess(incident(T0, true, T0.plusMinutes(5), null), T0.plusMinutes(40));
        assertEquals(RiskLevel.LOW, risk.level());
        assertEquals(17, risk.percentUsed());
    }

    @Test
    void breachIsBreached() {
        Incident i = incident(T0, true, null, null);
        i.checkSla(T0.plusMinutes(61));
        assertEquals(RiskLevel.BREACHED, SlaRiskAssessor.assess(i, T0.plusMinutes(61)).level());
    }

    @Test
    void resolvedOnTimeIsNone() {
        Incident i = incident(T0, true, T0.plusMinutes(5), T0.plusMinutes(60));
        assertEquals(RiskLevel.NONE, SlaRiskAssessor.assess(i, T0.plusMinutes(200)).level());
    }
}
