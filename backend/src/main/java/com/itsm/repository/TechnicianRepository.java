package com.itsm.repository;

import com.itsm.domain.Technician;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TechnicianRepository extends JpaRepository<Technician, String> {
    List<Technician> findByAvailableTrue();
}
