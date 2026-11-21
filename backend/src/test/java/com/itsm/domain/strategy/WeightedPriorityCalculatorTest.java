package com.itsm.domain.strategy;

import com.itsm.domain.Impact;
import com.itsm.domain.Priority;
import com.itsm.domain.Urgency;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.junit.jupiter.api.Assertions.assertEquals;

// score = impact x urgency x criticality; cut-offs: >= 18 P1, >= 9 P2, >= 4 P3, else P4.
// Each cut-off is tested exactly on it and just below it.
class WeightedPriorityCalculatorTest {

    private final WeightedPriorityCalculator calculator = new WeightedPriorityCalculator();

    @ParameterizedTest(name = "{0} x {1} x {2} = {3} -> {4}")
    @CsvSource({
            "HIGH,   HIGH,   3, 27, P1",
            "HIGH,   HIGH,   2, 18, P1",  // exactly on the P1 cut-off
            "MEDIUM, MEDIUM, 4, 16, P2",  // highest score below 18
            "MEDIUM, MEDIUM, 3, 12, P2",
            "HIGH,   HIGH,   1,  9, P2",  // exactly on the P2 cut-off
            "MEDIUM, MEDIUM, 2,  8, P3",  // just below 9
            "MEDIUM, MEDIUM, 1,  4, P3",  // exactly on the P3 cut-off
            "HIGH,   LOW,    1,  3, P4",  // just below 4
            "MEDIUM, LOW,    1,  2, P4",
            "LOW,    LOW,    1,  1, P4"
    })
    void scoreMapsToPriority(Impact impact, Urgency urgency, int criticality, int score, Priority expected) {
        assertEquals(score, impact.getWeight() * urgency.getWeight() * criticality); // the row is consistent
        assertEquals(expected, calculator.calculate(impact, urgency, criticality));
    }
}
