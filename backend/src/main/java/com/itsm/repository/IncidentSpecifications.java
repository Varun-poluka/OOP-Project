package com.itsm.repository;

import com.itsm.domain.Incident;
import com.itsm.dto.IncidentSearchCriteria;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public final class IncidentSpecifications {

    private IncidentSpecifications(){

    }

    public static Specification<Incident> matching(IncidentSearchCriteria c) {
        List<Specification<Incident>> specs = new ArrayList<>();

        if (c.status() != null) {
            specs.add((root, query, cb) -> cb.equal(root.get("status"), c.status()));
        }
        if (c.priority() != null) {
            specs.add((root, query, cb) -> cb.equal(root.get("priority"), c.priority()));
        }
        if (c.categoryName() != null) {
            specs.add((root, query, cb) -> cb.equal(root.get("category").get("name"), c.categoryName()));
        }
        if (c.technicianId() != null) {
            specs.add((root, query, cb) -> cb.equal(root.get("assignedTechnician").get("id"), c.technicianId()));
        }
        if (c.reporterId() != null) {
            specs.add((root, query, cb) -> cb.equal(root.get("reporter").get("id"), c.reporterId()));
        }
        if (c.from() != null) {
            specs.add((root, query, cb) -> cb.greaterThanOrEqualTo(root.<LocalDateTime>get("createdAt"), c.from()));
        }
        if (c.to() != null) {
            specs.add((root, query, cb) -> cb.lessThan(root.<LocalDateTime>get("createdAt"), c.to()));
        }
        if (c.breached() != null) {
            if (c.breached()) {
                specs.add((root, query, cb) -> cb.or(
                        cb.isTrue(root.<Boolean>get("responseBreached")),
                        cb.isTrue(root.<Boolean>get("resolutionBreached"))));
            } else {
                specs.add((root, query, cb) -> cb.and(
                        cb.isFalse(root.<Boolean>get("responseBreached")),
                        cb.isFalse(root.<Boolean>get("resolutionBreached"))));
            }
        }
        if (c.text() != null && !c.text().isBlank()) {
            String pattern = "%" + c.text().toLowerCase() + "%";
            specs.add((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.<String>get("title")), pattern),
                    cb.like(cb.lower(root.<String>get("description")), pattern)));
        }

        return Specification.allOf(specs);
    }
}
