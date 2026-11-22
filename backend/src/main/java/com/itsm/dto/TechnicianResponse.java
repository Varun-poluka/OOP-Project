package com.itsm.dto;

import com.itsm.domain.Category;
import com.itsm.domain.Technician;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public record TechnicianResponse(
        String id,
        String name,
        List<String> skills,
        boolean available,
        int activeIncidents,
        int maxWorkload,
        // false once an administrator deactivates the account
        boolean active) {

    public static TechnicianResponse from(Technician technician) {
        List<String> skills = new ArrayList<>();
        for (Category category : technician.getSkills()) {
            skills.add(category.getName());
        }
        Collections.sort(skills); // skills is a Set, so sort for a stable order
        return new TechnicianResponse(technician.getId(), technician.getName(),
                Collections.unmodifiableList(skills), technician.isAvailable(),
                technician.getActiveIncidents(), technician.getMaxWorkload(), technician.isActive());
    }
}
