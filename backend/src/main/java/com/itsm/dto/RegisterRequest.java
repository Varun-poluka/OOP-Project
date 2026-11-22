package com.itsm.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Self-registration always creates an employee, so there is no role field to tamper with.
public record RegisterRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Email @Size(max = 200) String email,
        @NotBlank @Size(min = 8, max = 100, message = "must be 8 to 100 characters") String password
) { }
