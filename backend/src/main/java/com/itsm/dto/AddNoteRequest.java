package com.itsm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddNoteRequest(
        @NotBlank String technicianId,
        @NotBlank @Size(max = 2000) String text
) {
}
