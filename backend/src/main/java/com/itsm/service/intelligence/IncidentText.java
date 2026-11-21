package com.itsm.service.intelligence;

import com.itsm.domain.Incident;

// The parts of an incident that duplicate detection compares. categoryName and serviceName may be null.
public record IncidentText(String title, String description, String categoryName, String serviceName) {

    public static IncidentText of(Incident incident) {
        return new IncidentText(incident.getTitle(), incident.getDescription(),
                incident.getCategory().getName(), incident.getAffectedService().getName());
    }
}
