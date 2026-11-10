package com.itsm.domain.strategy;

import com.itsm.domain.Incident;
import com.itsm.domain.Technician;

import java.util.List;
import java.util.Optional;

public interface AssignmentStrategy {
    String getName();

    Optional<Technician> selectTechnician(Incident incident, List<Technician> candidates);
}
