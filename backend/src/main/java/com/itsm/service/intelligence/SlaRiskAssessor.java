package com.itsm.service.intelligence;

import com.itsm.domain.Incident;

import java.time.Duration;
import java.time.LocalDateTime;

// Turns an incident's SLA clocks into a risk level, using the most urgent running clock.
public final class SlaRiskAssessor {

    public static final double MEDIUM_THRESHOLD = 0.5;

    private SlaRiskAssessor() { }

    public static SlaRisk assess(Incident incident, LocalDateTime now) {
        if (incident == null) {
            throw new NullPointerException("incident is required");
        }
        if (now == null) {
            throw new NullPointerException("now is required");
        }
        if (incident.getResponseDueAt() == null || incident.getResolutionDueAt() == null) {
            return new SlaRisk(RiskLevel.NONE, null);
        }
        double used = -1; // -1 means "no clock is running"
        if (incident.getAcknowledgedAt() == null) {
            used = Math.max(used, share(incident.getCreatedAt(), incident.getResponseDueAt(), now));
        }
        if (incident.getResolvedAt() == null) {
            used = Math.max(used, share(incident.getCreatedAt(), incident.getResolutionDueAt(), now));
        }
        Integer percent = (used < 0) ? null : (int) Math.round(used * 100);
        if (incident.isResponseBreached() || incident.isResolutionBreached()) {
            return new SlaRisk(RiskLevel.BREACHED, percent);
        }
        if (percent == null) {
            return new SlaRisk(RiskLevel.NONE, null); // both clocks have stopped
        }
        if (used >= Incident.RISK_THRESHOLD) {
            return new SlaRisk(RiskLevel.HIGH, percent);
        }
        if (used >= MEDIUM_THRESHOLD) {
            return new SlaRisk(RiskLevel.MEDIUM, percent);
        }
        return new SlaRisk(RiskLevel.LOW, percent);
    }

    private static double share(LocalDateTime start, LocalDateTime due, LocalDateTime now) {
        long window = Duration.between(start, due).toSeconds();
        if (window <= 0) {
            return 1.0;
        }
        return Math.max(0.0, (double) Duration.between(start, now).toSeconds() / window);
    }
}
