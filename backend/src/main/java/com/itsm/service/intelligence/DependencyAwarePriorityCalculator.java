package com.itsm.service.intelligence;

import com.itsm.domain.ITService;
import com.itsm.domain.Impact;
import com.itsm.domain.Priority;
import com.itsm.domain.Urgency;
import com.itsm.domain.strategy.PriorityCalculator;

import java.util.Collection;
import java.util.List;
import java.util.function.Supplier;

// Decorator: wraps another PriorityCalculator, keeps its answer, and raises it one level
// when the failed service has many dependents. Callers only see the PriorityCalculator interface.
public class DependencyAwarePriorityCalculator implements PriorityCalculator {

    public static final int IMPACT_THRESHOLD = 3;

    private final PriorityCalculator inner;
    private final ServiceImpactAnalyzer analyzer;
    private final Supplier<? extends Collection<ITService>> allServices;

    public DependencyAwarePriorityCalculator(PriorityCalculator inner, ServiceImpactAnalyzer analyzer,
                                             Supplier<? extends Collection<ITService>> allServices) {
        if (inner == null) {
            throw new NullPointerException("inner calculator is required");
        }
        if (analyzer == null) {
            throw new NullPointerException("analyzer is required");
        }
        if (allServices == null) {
            throw new NullPointerException("allServices supplier is required");
        }
        this.inner = inner;
        this.analyzer = analyzer;
        this.allServices = allServices;
    }

    // Without a service there is no graph to look at, so the inner answer is returned unchanged.
    @Override
    public Priority calculate(Impact impact, Urgency urgency, int businessCriticality) {
        return inner.calculate(impact, urgency, businessCriticality);
    }

    @Override
    public Priority calculate(Impact impact, Urgency urgency, ITService service) {
        Priority base = inner.calculate(impact, urgency, service);
        List<ImpactedService> impacted = analyzer.analyze(service, allServices.get());
        if (impacted.size() >= IMPACT_THRESHOLD) {
            return raise(base);
        }
        return base;
    }

    // P4 -> P3 -> P2 -> P1; P1 stays P1.
    static Priority raise(Priority priority) {
        if (priority == Priority.P1) {
            return Priority.P1;
        }
        return Priority.values()[priority.ordinal() - 1];
    }
}
