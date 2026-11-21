package com.itsm.dto;

import jakarta.validation.constraints.NotBlank;

public record ReassignRequest(
        @NotBlank String newTechnicianId
) {
}
