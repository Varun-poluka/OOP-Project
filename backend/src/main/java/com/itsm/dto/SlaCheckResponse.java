package com.itsm.dto;

import java.time.LocalDateTime;

// breachesRecorded: incidents with a new breach (lagging). risksRecorded: incidents newly at risk (leading).
public record SlaCheckResponse(LocalDateTime checkedAt, int breachesRecorded, int risksRecorded) { }
