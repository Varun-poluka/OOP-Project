package com.itsm.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// The name becomes the id (stored uppercase), so only letters, digits and underscores.
public record CreateCategoryRequest(
        @NotBlank @Size(max = 40)
        @Pattern(regexp = "[A-Za-z0-9_]+", message = "may only contain letters, digits and _") String name,
        @Size(max = 200) String description
) { }
