package com.itsm.service;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.itsm.dto.SlaCheckResponse;

import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class SlaScheduler {

    private static final Logger log = LoggerFactory.getLogger(SlaScheduler.class);
    private final SlaService slaService;

    public SlaScheduler(SlaService slaService) {
        this.slaService = slaService;
    }

    @Scheduled(fixedRate = 60000)
    public void checkSlas() {
        SlaCheckResponse result = slaService.checkAll(LocalDateTime.now());
        if (result.breachesRecorded() > 0 || result.risksRecorded() > 0) {
            log.warn("SLA check: {} new breach(es), {} new at-risk warning(s)",
                    result.breachesRecorded(), result.risksRecorded());
        }
    }
}