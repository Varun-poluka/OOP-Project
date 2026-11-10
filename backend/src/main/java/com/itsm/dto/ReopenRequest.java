package com.itsm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReopenRequest(
        @NotBlank String employeeId,
        @NotBlank @Size(max = 2000) String reason
) {
}
