package com.itsm.dto;

// Compliance values are percentages (0-100); all four values are null when there is no data.
public record SlaSummary(
        int incidents,
        Double responseCompliance,
        Double resolutionCompliance,
        Double meanMinutesToAcknowledge,
        Double meanMinutesToResolve) { }
