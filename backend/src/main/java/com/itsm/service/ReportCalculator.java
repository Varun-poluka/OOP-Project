package com.itsm.service;

import com.itsm.domain.Incident;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

// Pure calculations over incidents: no Spring, no database, so it can be unit tested directly.
// Every method returns null when there is no data, so "no data" is never shown as 0% or 100%.
public final class ReportCalculator {

    private ReportCalculator() {
    }

    // An incident counts only once its response SLA is decided: it was acknowledged, or it breached.
    // Incidents without an SLA, or still inside their window, are left out of the denominator.
    public static Double responseCompliance(List<Incident> incidents) {
        requireList(incidents);
        int decided = 0;
        int met = 0;
        for (Incident incident : incidents) {
            if (isDecided(incident.getResponseDueAt(), incident.getAcknowledgedAt(), incident.isResponseBreached())) {
                decided++;
                if (isMet(incident.getResponseDueAt(), incident.getAcknowledgedAt())) {
                    met++;
                }
            }
        }
        return percentage(met, decided);
    }

    public static Double resolutionCompliance(List<Incident> incidents) {
        requireList(incidents);
        int decided = 0;
        int met = 0;
        for (Incident incident : incidents) {
            if (isDecided(incident.getResolutionDueAt(), incident.getResolvedAt(), incident.isResolutionBreached())) {
                decided++;
                if (isMet(incident.getResolutionDueAt(), incident.getResolvedAt())) {
                    met++;
                }
            }
        }
        return percentage(met, decided);
    }

    public static Double meanMinutesToAcknowledge(List<Incident> incidents) {
        requireList(incidents);
        long totalMinutes = 0;
        int count = 0;
        for (Incident incident : incidents) {
            if (incident.getAcknowledgedAt() != null) {
                totalMinutes += Duration.between(incident.getCreatedAt(), incident.getAcknowledgedAt()).toMinutes();
                count++;
            }
        }
        return average(totalMinutes, count);
    }

    public static Double meanMinutesToResolve(List<Incident> incidents) {
        requireList(incidents);
        long totalMinutes = 0;
        int count = 0;
        for (Incident incident : incidents) {
            if (incident.getResolvedAt() != null) {
                totalMinutes += Duration.between(incident.getCreatedAt(), incident.getResolvedAt()).toMinutes();
                count++;
            }
        }
        return average(totalMinutes, count);
    }

    private static boolean isDecided(LocalDateTime dueAt, LocalDateTime doneAt, boolean breached) {
        return dueAt != null && (doneAt != null || breached);
    }

    // Judged by timestamps, not only the breached flag: done at or before the deadline is met.
    private static boolean isMet(LocalDateTime dueAt, LocalDateTime doneAt) {
        return doneAt != null && !doneAt.isAfter(dueAt);
    }

    private static Double percentage(int met, int decided) {
        if (decided == 0) {
            return null;
        }
        return 100.0 * met / decided;
    }

    private static Double average(long total, int count) {
        if (count == 0) {
            return null;
        }
        return (double) total / count;
    }

    private static void requireList(List<Incident> incidents) {
        if (incidents == null) {
            throw new IllegalArgumentException("incidents must not be null");
        }
    }
}
