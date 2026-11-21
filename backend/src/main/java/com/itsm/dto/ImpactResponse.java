package com.itsm.dto;

import com.itsm.domain.ITService;
import com.itsm.service.intelligence.ImpactedService;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public record ImpactResponse(
        Long serviceId,
        String serviceName,
        int impactedCount,
        List<Impacted> impacted
) {
    public record Impacted(Long id, String name, int businessCriticality, int distance) { }

    public static ImpactResponse from(ITService outage, List<ImpactedService> impactedServices) {
        List<Impacted> impacted = new ArrayList<>();
        for (ImpactedService item : impactedServices) {
            ITService service = item.service();
            impacted.add(new Impacted(service.getId(), service.getName(), service.getBusinessCriticality(), item.distance()));
        }
        return new ImpactResponse(outage.getId(), outage.getName(), impacted.size(),
                Collections.unmodifiableList(impacted));
    }
}
