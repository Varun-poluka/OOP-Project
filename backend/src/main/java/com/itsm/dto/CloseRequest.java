package com.itsm.dto;

import jakarta.validation.constraints.NotBlank;

public record CloseRequest(
        @NotBlank String userId
) {
}
