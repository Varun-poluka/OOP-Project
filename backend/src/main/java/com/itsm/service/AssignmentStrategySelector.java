package com.itsm.service;

import com.itsm.domain.strategy.AssignmentStrategy;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AssignmentStrategySelector {

    private final Map<String, AssignmentStrategy> strategies = new HashMap<>();
    private AssignmentStrategy current;

    public AssignmentStrategySelector(List<AssignmentStrategy> allStrategies){
        for(AssignmentStrategy strategy : allStrategies){
            strategies.put(strategy.getName(), strategy);
        }
        current = strategies.get("SKILL_BASED");
    }
    public AssignmentStrategy getCurrent() {
        return current;
    }

    public void setCurrent(String name) {
        AssignmentStrategy chosen = strategies.get(name);
        if (chosen == null) {
            throw new IllegalArgumentException("Unknown strategy: " + name + ". Available: " + strategies.keySet());
        }
        current = chosen;
    }

    public Set<String> getAvailable() {
        return Collections.unmodifiableSet(strategies.keySet());
    }
}
