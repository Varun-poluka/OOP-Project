package com.itsm.dto;

import java.util.Set;

public record StrategyResponse(
        String current,
        Set<String> available
) {
}
