package com.itsm.service.intelligence;

import com.itsm.domain.ITService;

// distance = number of dependency hops from the failed service (1 = depends on it directly).
public record ImpactedService(ITService service, int distance) { }
