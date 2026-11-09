package com.itsm.dto;

import jakarta.validation.constraints.NotBlank;

public record VerifyRequest(
        @NotBlank String employeeId
) {
}
