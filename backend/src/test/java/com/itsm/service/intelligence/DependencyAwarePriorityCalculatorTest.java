package com.itsm.service.intelligence;

import com.itsm.domain.ITService;
import com.itsm.domain.Impact;
import com.itsm.domain.Priority;
import com.itsm.domain.Urgency;
import com.itsm.domain.strategy.PriorityCalculator;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DependencyAwarePriorityCalculatorTest {

    private static ITService service(String name, long id) {
        ITService s = new ITService(name, 2);
        ReflectionTestUtils.setField(s, "id", id);
        return s;
    }

    // A core service plus 'dependents' services that each depend on it directly.
    private static List<ITService> graph(ITService core, int dependents) {
        List<ITService> all = new ArrayList<>();
        all.add(core);
        for (int i = 0; i < dependents; i++) {
            ITService s = service("S" + i, 100 + i);
            s.addDependency(core);
            all.add(s);
        }
        return all;
    }

    // The inner calculator is a lambda that always answers the given priority.
    private static DependencyAwarePriorityCalculator decorate(Priority fixed, List<ITService> all) {
        PriorityCalculator inner = (impact, urgency, criticality) -> fixed;
        return new DependencyAwarePriorityCalculator(inner, new ServiceImpactAnalyzer(), () -> all);
    }

    @Test
    void threeImpactedServicesRaiseOneLevel() {
        ITService core = service("Core", 1);
        assertEquals(Priority.P2, decorate(Priority.P3, graph(core, 3)).calculate(Impact.LOW, Urgency.LOW, core));
    }

    @Test
    void twoImpactedServicesKeepThePriority() {
        ITService core = service("Core", 1);
        assertEquals(Priority.P3, decorate(Priority.P3, graph(core, 2)).calculate(Impact.LOW, Urgency.LOW, core));
    }

    @Test
    void p1IsNeverRaisedAboveP1() {
        ITService core = service("Core", 1);
        assertEquals(Priority.P1, decorate(Priority.P1, graph(core, 5)).calculate(Impact.HIGH, Urgency.HIGH, core));
    }

    @Test
    void p4BecomesP3() {
        ITService core = service("Core", 1);
        assertEquals(Priority.P3, decorate(Priority.P4, graph(core, 4)).calculate(Impact.LOW, Urgency.LOW, core));
    }

    @Test
    void criticalityOnlyVersionIsPassedThroughUnchanged() {
        ITService core = service("Core", 1);
        assertEquals(Priority.P3, decorate(Priority.P3, graph(core, 5)).calculate(Impact.LOW, Urgency.LOW, 2));
    }
}
