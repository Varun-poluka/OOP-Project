package com.itsm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RequestInfoRequest(
        @NotBlank @Size(max = 2000) String question
) { }
