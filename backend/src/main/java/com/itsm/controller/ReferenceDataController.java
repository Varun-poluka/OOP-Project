package com.itsm.controller;

import com.itsm.dto.CategoryResponse;
import com.itsm.dto.TechnicianResponse;
import com.itsm.service.ReferenceDataService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// Role rules are in SecurityConfig: categories for any logged-in user, technicians for admins,
// /api/technicians/me for technicians.
@RestController
public class ReferenceDataController {
    private final ReferenceDataService referenceDataService;

    public ReferenceDataController(ReferenceDataService referenceDataService) {
        this.referenceDataService = referenceDataService;
    }

    @GetMapping("/api/categories")
    public List<CategoryResponse> categories() {
        return referenceDataService.categories();
    }

    @GetMapping("/api/technicians")
    public List<TechnicianResponse> technicians() {
        return referenceDataService.technicians();
    }

    @GetMapping("/api/technicians/me")
    public TechnicianResponse me(@AuthenticationPrincipal Jwt jwt) {
        return referenceDataService.technician(jwt.getSubject());
    }
}
