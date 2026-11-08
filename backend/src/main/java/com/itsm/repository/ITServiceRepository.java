package com.itsm.repository;

import com.itsm.domain.ITService;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ITServiceRepository extends JpaRepository<ITService, Long> {
    Optional<ITService> findByName(String name);
}
