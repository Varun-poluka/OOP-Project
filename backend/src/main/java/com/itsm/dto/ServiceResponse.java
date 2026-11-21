package com.itsm.dto;

import com.itsm.domain.ITService;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

// dependsOn lists only the direct dependencies; GET /api/services/{id}/impact follows the whole graph.
public record ServiceResponse(
        Long id,
        String name,
        int businessCriticality,
        List<ServiceRef> dependsOn,
        long openIncidentCount
) {
    public static ServiceResponse from(ITService service, long openIncidentCount) {
        List<ServiceRef> dependsOn = new ArrayList<>();
        for (ITService dependency : service.getDependencies()) {
            dependsOn.add(ServiceRef.from(dependency));
        }
        return new ServiceResponse(service.getId(), service.getName(), service.getBusinessCriticality(),
                Collections.unmodifiableList(dependsOn), openIncidentCount);
    }
}
