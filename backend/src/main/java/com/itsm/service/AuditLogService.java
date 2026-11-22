package com.itsm.service;

import com.itsm.domain.AuditRecord;
import com.itsm.dto.AuditLogCriteria;
import com.itsm.dto.AuditLogEntry;
import com.itsm.dto.PageResponse;
import com.itsm.repository.AuditRecordRepository;
import com.itsm.repository.AuditSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// The audit trail of every incident in one paged list, for administrators.
@Service
public class AuditLogService {

    static final int MAX_PAGE_SIZE = 100;
    // Newest first; the id breaks ties between records written in the same instant.
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("timestamp"), Sort.Order.desc("id"));

    private final AuditRecordRepository auditRecordRepository;

    public AuditLogService(AuditRecordRepository auditRecordRepository) {
        this.auditRecordRepository = auditRecordRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogEntry> search(AuditLogCriteria criteria, int page, int size) {
        if (page < 0) {
            throw new IllegalArgumentException("page must be 0 or more");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("size must be between 1 and " + MAX_PAGE_SIZE);
        }
        if (criteria.from() != null && criteria.to() != null && !criteria.from().isBefore(criteria.to())) {
            throw new IllegalArgumentException("'from' must be before 'to'");
        }
        Page<AuditRecord> result = auditRecordRepository.findAll(AuditSpecifications.matching(criteria),
                PageRequest.of(page, size, NEWEST_FIRST));
        return PageResponse.from(result, AuditLogEntry::from);
    }
}
