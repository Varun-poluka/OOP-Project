package com.itsm.repository;

import com.itsm.domain.AuditRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

// Read-only use: audit records are only ever created through Incident's lifecycle methods.
public interface AuditRecordRepository extends JpaRepository<AuditRecord, Long>, JpaSpecificationExecutor<AuditRecord> {
}
