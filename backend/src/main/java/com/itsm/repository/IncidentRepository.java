package com.itsm.repository;

import com.itsm.domain.Incident;
import com.itsm.domain.IncidentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Collection;
import java.util.List;

public interface IncidentRepository extends JpaRepository<Incident, String>, JpaSpecificationExecutor<Incident> {

    List<Incident> findByStatus(IncidentStatus status);
    List<Incident> findByStatusNotIn(Collection<IncidentStatus> statuses);
}