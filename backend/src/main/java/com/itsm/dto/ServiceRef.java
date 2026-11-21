package com.itsm.dto;

import com.itsm.domain.ITService;

public record ServiceRef(Long id, String name) {
    public static ServiceRef from(ITService service) {
        return new ServiceRef(service.getId(), service.getName());
    }
}
