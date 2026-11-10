package com.itsm.domain.strategy;

import com.itsm.domain.Impact;
import com.itsm.domain.Priority;
import com.itsm.domain.Urgency;

public interface PriorityCalculator {
    Priority calculate(Impact impact, Urgency urgency, int businessCriticality);
}
