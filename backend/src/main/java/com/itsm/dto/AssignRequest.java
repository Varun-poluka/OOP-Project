package com.itsm.dto;

import jakarta.validation.constraints.NotBlank;

// technicianId names who gets the work; the acting admin comes from the token.
public record AssignRequest(
        @NotBlank String technicianId
) {
}
