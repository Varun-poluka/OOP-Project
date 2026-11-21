package com.itsm.domain.strategy;

import com.itsm.domain.ITService;
import com.itsm.domain.Impact;
import com.itsm.domain.Priority;
import com.itsm.domain.Urgency;

public interface PriorityCalculator {
    Priority calculate(Impact impact, Urgency urgency, int businessCriticality);

    // Service-aware version. By default it only uses the service's criticality;
    // a decorator can override it to look at the whole service (e.g. its dependents).
    default Priority calculate(Impact impact, Urgency urgency, ITService service) {
        if (service == null) {
            throw new NullPointerException("service is required");
        }
        return calculate(impact, urgency, service.getBusinessCriticality());
    }
}
