package com.itsm.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

// dependsOnIds is optional: the services this new service depends on.
public record CreateServiceRequest(
        @NotBlank @Size(max = 100) String name,
        @Min(1) @Max(3) int businessCriticality,
        List<Long> dependsOnIds
) { }
