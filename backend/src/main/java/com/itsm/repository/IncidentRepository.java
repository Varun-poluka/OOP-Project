package com.itsm.repository;

import com.itsm.domain.Incident;
import com.itsm.domain.IncidentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IncidentRepository extends JpaRepository<Incident, String> {

    List<Incident> findByStatus(IncidentStatus status);
}