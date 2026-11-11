package com.itsm.repository;

import com.itsm.domain.Priority;
import com.itsm.domain.SLAPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SLAPolicyRepository extends JpaRepository<SLAPolicy, Priority> {

}