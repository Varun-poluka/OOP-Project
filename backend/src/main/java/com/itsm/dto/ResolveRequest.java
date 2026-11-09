package com.itsm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResolveRequest(
        @NotBlank String technicianId,
        @NotBlank @Size(max = 2000) String resolutionDetails
) {
}
