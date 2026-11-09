package com.itsm.dto;

import com.itsm.domain.Priority;
import jakarta.validation.constraints.NotNull;

public record ClassifyRequest(
        @NotNull Priority priority
) {
}
