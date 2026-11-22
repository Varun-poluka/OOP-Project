package com.itsm.repository;

import com.itsm.domain.AuditRecord;
import com.itsm.dto.AuditLogCriteria;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// Builds the WHERE clause of the audit log from the filters that were given (like IncidentSpecifications).
public final class AuditSpecifications {

    private AuditSpecifications() {
    }

    public static Specification<AuditRecord> matching(AuditLogCriteria c) {
        List<Specification<AuditRecord>> specs = new ArrayList<>();

        if (c.incidentId() != null && !c.incidentId().isBlank()) {
            String incidentId = c.incidentId().trim().toUpperCase();
            specs.add((root, query, cb) -> cb.equal(root.get("incidentId"), incidentId));
        }
        if (c.actorId() != null && !c.actorId().isBlank()) {
            // "SYSTEM" selects the automatic entries, which have no actor.
            if (c.actorId().equals("SYSTEM")) {
                specs.add((root, query, cb) -> cb.isNull(root.get("actor")));
            } else {
                specs.add((root, query, cb) -> cb.equal(root.get("actor").get("id"), c.actorId()));
            }
        }
        if (c.action() != null && !c.action().isBlank()) {
            String action = c.action().trim().toUpperCase();
            specs.add((root, query, cb) -> cb.equal(root.get("action"), action));
        }
        if (c.from() != null) {
            specs.add((root, query, cb) -> cb.greaterThanOrEqualTo(root.<LocalDateTime>get("timestamp"), c.from()));
        }
        if (c.to() != null) {
            specs.add((root, query, cb) -> cb.lessThan(root.<LocalDateTime>get("timestamp"), c.to()));
        }
        return Specification.allOf(specs);
    }
}
