package com.itsm.domain.strategy;

import com.itsm.domain.Incident;
import com.itsm.domain.Technician;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class LoadBasedAssignmentStrategy implements AssignmentStrategy{
    @Override
    public String getName(){
        return "LOAD_BASED";
    }

    @Override
    public Optional<Technician> selectTechnician(Incident incident, List<Technician> candidates) {
        Technician best = null;
        for (Technician tech : candidates) {
            if (!tech.canTakeMoreWork()) {
                continue;
            }
            if (best == null || tech.getActiveIncidents() < best.getActiveIncidents()) {
                best = tech;
            }
        }
        return Optional.ofNullable(best);
    }
}
