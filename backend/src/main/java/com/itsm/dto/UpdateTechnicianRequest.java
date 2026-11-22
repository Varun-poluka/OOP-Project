package com.itsm.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.List;

// Replaces all three at once, like the edit form sends them. available = false means on leave.
public record UpdateTechnicianRequest(
        @NotNull List<String> skills,
        @NotNull Boolean available,
        @NotNull @Min(1) @Max(50) Integer maxWorkload
) { }
