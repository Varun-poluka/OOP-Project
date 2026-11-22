package com.itsm.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

// Both optional: the reporter may verify without giving feedback. Integer, not int, so "no rating" is null.
public record VerifyRequest(
        @Min(1) @Max(5) Integer rating,
        @Size(max = 2000) String comment
) { }
