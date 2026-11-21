package com.itsm.service.intelligence;

// percentUsed is null when no SLA clock is running.
public record SlaRisk(RiskLevel level, Integer percentUsed) { }
