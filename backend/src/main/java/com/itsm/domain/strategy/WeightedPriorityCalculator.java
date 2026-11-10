package com.itsm.domain.strategy;

import com.itsm.domain.Impact;
import com.itsm.domain.Priority;
import com.itsm.domain.Urgency;
import org.springframework.stereotype.Component;

@Component
public class WeightedPriorityCalculator implements PriorityCalculator{

    @Override
    public Priority calculate(Impact impact, Urgency urgency, int businessCriticality){
        int score = impact.getWeight() * urgency.getWeight() * businessCriticality;

        if(score >= 18){
            return Priority.P1;
        }
        else if(score >= 9){
            return Priority.P2;
        }
        else if(score >= 4){
            return Priority.P3;
        }
        else{
            return Priority.P4;
        }
    }
}
