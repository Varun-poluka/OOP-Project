package com.itsm.dto;

import jakarta.validation.constraints.NotBlank;

public record ChangeStrategyRequest(
        @NotBlank String strategy
) {
}
