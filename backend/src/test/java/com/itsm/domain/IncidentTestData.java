package com.itsm.domain;

import java.time.LocalDateTime;

// Builds real Incidents through their public lifecycle methods. It lives in com.itsm.domain
// so it can call the package-private overrideTimestampsForTest hook to set chosen times.
public final class IncidentTestData {

    public static final int RESPONSE_MINUTES = 60;
    public static final int RESOLUTION_MINUTES = 240;

    private static int counter = 0;

    private IncidentTestData() {
    }

    // acknowledgedAt / resolvedAt may be null to leave that step out.
    public static Incident incident(LocalDateTime createdAt, boolean withSla,
                                    LocalDateTime acknowledgedAt, LocalDateTime resolvedAt) {
        counter++;
        Employee reporter = new Employee("U-EMP-T" + counter, "Test Employee", "emp" + counter + "@test.local", "hash");
        Technician tech = new Technician("U-TEC-T" + counter, "Test Tech", "tech" + counter + "@test.local", "hash", 5);
        Incident incident = new Incident("INC-T" + counter, "Test incident", "description", reporter,
                new Category("NETWORK", "Network issues"), new ITService("Test Service", 3),
                Impact.HIGH, Urgency.HIGH);

        // Set createdAt first, so startSla computes the deadlines from it.
        incident.overrideTimestampsForTest(createdAt, null, null);
        incident.classify(Priority.P2);
        if (withSla) {
            incident.startSla(new SLAPolicy(Priority.P2, RESPONSE_MINUTES, RESOLUTION_MINUTES));
        }
        incident.assignTo(tech);
        if (acknowledgedAt != null) {
            incident.acknowledge(tech);
        }
        if (resolvedAt != null) {
            incident.startWork(tech);
            incident.resolve(tech, "Fixed in test");
        }
        incident.overrideTimestampsForTest(createdAt, acknowledgedAt, resolvedAt);
        return incident;
    }

    // A NEW incident with the given text, created at createdAt. If resolved is true it is taken
    // through assign -> acknowledge -> start -> resolve, so its status is RESOLVED.
    public static Incident reported(String title, String description, String categoryName, ITService service,
                                    LocalDateTime createdAt, boolean resolved) {
        counter++;
        Employee reporter = new Employee("U-EMP-T" + counter, "Test Employee", "emp" + counter + "@test.local", "hash");
        Incident incident = new Incident("INC-T" + counter, title, description, reporter,
                new Category(categoryName, categoryName), service, Impact.MEDIUM, Urgency.MEDIUM);
        if (resolved) {
            Technician tech = new Technician("U-TEC-T" + counter, "Test Tech", "tech" + counter + "@test.local", "hash", 5);
            incident.classify(Priority.P3);
            incident.assignTo(tech);
            incident.acknowledge(tech);
            incident.startWork(tech);
            incident.resolve(tech, "Fixed in test");
        }
        incident.overrideTimestampsForTest(createdAt, incident.getAcknowledgedAt(), incident.getResolvedAt());
        return incident;
    }

    // Raises a technician's open-incident count (addIncident is package-private in the domain).
    public static void giveActiveIncidents(Technician tech, int count) {
        for (int i = 0; i < count; i++) {
            tech.addIncident();
        }
    }
}
