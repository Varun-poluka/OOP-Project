package com.itsm.dto;

import com.itsm.domain.Impact;
import com.itsm.domain.Urgency;
import jakarta.validation.constraints.*;

public record CreateIncidentRequest(
        @NotBlank @Size(max = 200) String title,
        @Size(max = 2000) String description,
        @NotBlank String categoryName,
        @NotNull Long serviceId,
        @NotNull Impact impact,
        @NotNull Urgency urgency,
        // Admins only: the employee this incident is reported for. Employees always report for themselves.
        String onBehalfOfEmployeeId

        ){
}
