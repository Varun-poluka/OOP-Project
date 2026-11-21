package com.itsm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Sent by the report form before submitting. categoryName and affectedServiceId are optional.
public record DuplicateCheckRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 2000) String description,
        String categoryName,
        Long affectedServiceId
) { }
