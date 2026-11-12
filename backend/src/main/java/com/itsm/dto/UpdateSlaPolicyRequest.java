package com.itsm.dto;

import jakarta.validation.constraints.Positive;

public record UpdateSlaPolicyRequest(
        @Positive int responseMinutes,
        @Positive int resolutionMinutes
) { }
