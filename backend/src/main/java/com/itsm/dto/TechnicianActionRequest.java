package com.itsm.dto;

import jakarta.validation.constraints.NotBlank;

public record TechnicianActionRequest(
        @NotBlank String technicianId
) {
}
