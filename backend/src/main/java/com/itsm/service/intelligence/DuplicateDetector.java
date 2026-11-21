package com.itsm.service.intelligence;

import com.itsm.domain.Incident;

import java.time.LocalDateTime;
import java.util.List;

// Strategy interface: other detectors (e.g. one based on embeddings) could replace the token-based one.
public interface DuplicateDetector {
    List<DuplicateMatch> findDuplicates(IncidentText probe, List<Incident> candidates, LocalDateTime now);
}
