package com.itsm.dto;

public record TechnicianWorkload(
        String id,
        String name,
        boolean available,
        long openIncidents,
        long resolvedIncidents) { }
