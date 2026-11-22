package com.itsm.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

// role is EMPLOYEE, TECHNICIAN or ADMIN. maxWorkload and skills are used only for technicians
// (maxWorkload is then required; skills may be empty).
public record CreateUserRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Email @Size(max = 200) String email,
        @NotBlank @Size(min = 8, max = 100, message = "must be 8 to 100 characters") String password,
        @NotBlank @Pattern(regexp = "EMPLOYEE|TECHNICIAN|ADMIN", message = "must be EMPLOYEE, TECHNICIAN or ADMIN") String role,
        @Min(1) @Max(50) Integer maxWorkload,
        List<String> skills
) { }
