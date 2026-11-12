package com.itsm.dto;

import com.itsm.domain.Priority;
import com.itsm.domain.SLAPolicy;

public record SlaPolicyResponse(Priority priority, int responseMinutes, int resolutionMinutes) {
    public static SlaPolicyResponse from(SLAPolicy policy) {
        return new SlaPolicyResponse(
                policy.getPriority(),
                policy.getResponseMinutes(),
                policy.getResolutionMinutes());
    }
}
