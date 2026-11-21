package com.itsm.service.intelligence;

import com.itsm.domain.ITService;

import java.util.*;

// "A depends on B" means an outage of B impacts A. So we walk the dependency edges backwards
// (from B to everything that depends on B) with a breadth-first search.
// Everything is keyed by service id, not by object: two Java objects loaded in different
// persistence contexts can stand for the same database row.
public class ServiceImpactAnalyzer {

    public List<ImpactedService> analyze(ITService outage, Collection<ITService> allServices) {
        if (outage == null) {
            throw new NullPointerException("outage service is required");
        }
        if (outage.getId() == null) {
            throw new IllegalArgumentException("outage service must have an id");
        }
        if (allServices == null) {
            throw new NullPointerException("allServices is required");
        }

        // Reverse graph: id of B -> services that depend on B.
        Map<Long, List<ITService>> dependents = new HashMap<>();
        for (ITService service : allServices) {
            for (ITService dependency : service.getDependencies()) {
                dependents.computeIfAbsent(dependency.getId(), k -> new ArrayList<>()).add(service);
            }
        }

        List<ImpactedService> result = new ArrayList<>();
        Set<Long> visited = new HashSet<>();
        visited.add(outage.getId()); // the failed service itself is not "impacted"
        Deque<ImpactedService> queue = new ArrayDeque<>();
        queue.add(new ImpactedService(outage, 0));

        while (!queue.isEmpty()) {
            ImpactedService current = queue.poll();
            List<ITService> next = dependents.getOrDefault(current.service().getId(), List.of());
            for (ITService dependent : next) {
                // add() returns false if the id was already seen: this is what stops cycles.
                if (visited.add(dependent.getId())) {
                    ImpactedService impacted = new ImpactedService(dependent, current.distance() + 1);
                    result.add(impacted);
                    queue.add(impacted);
                }
            }
        }
        return List.copyOf(result);
    }
}
