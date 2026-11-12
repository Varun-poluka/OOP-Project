package com.itsm.dto;

import java.time.LocalDateTime;

public record SlaCheckResponse(LocalDateTime checkedAt, int breachesRecorded) { }
