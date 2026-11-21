package com.itsm.config;

import com.itsm.domain.strategy.PriorityCalculator;
import com.itsm.domain.strategy.WeightedPriorityCalculator;
import com.itsm.repository.ITServiceRepository;
import com.itsm.service.intelligence.DependencyAwarePriorityCalculator;
import com.itsm.service.intelligence.DuplicateDetector;
import com.itsm.service.intelligence.ServiceImpactAnalyzer;
import com.itsm.service.intelligence.TechnicianScorer;
import com.itsm.service.intelligence.TokenSimilarityDuplicateDetector;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

// The intelligence classes are plain Java (no Spring annotations), so they are registered as beans here.
@Configuration
public class IntelligenceConfig {

    @Bean
    public DuplicateDetector duplicateDetector() {
        return new TokenSimilarityDuplicateDetector();
    }

    @Bean
    public TechnicianScorer technicianScorer() {
        return new TechnicianScorer();
    }

    @Bean
    public ServiceImpactAnalyzer serviceImpactAnalyzer() {
        return new ServiceImpactAnalyzer();
    }

    // Two beans now implement PriorityCalculator (the weighted one and this decorator).
    // @Primary makes Spring inject the decorator wherever a PriorityCalculator is asked for.
    @Bean
    @Primary
    public PriorityCalculator priorityCalculator(WeightedPriorityCalculator weighted,
                                                 ServiceImpactAnalyzer analyzer,
                                                 ITServiceRepository itServiceRepository) {
        return new DependencyAwarePriorityCalculator(weighted, analyzer, itServiceRepository::findAll);
    }
}
