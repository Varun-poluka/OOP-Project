package com.itsm.service.intelligence;

import com.itsm.domain.Category;
import com.itsm.domain.Technician;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

// Weighted scoring out of 100. The weights are explained in docs/learning-log.md (slice 3).
public class TechnicianScorer {

    public static final int SKILL_POINTS = 40;
    public static final int CAPACITY_POINTS = 25;
    public static final int EXPERIENCE_POINTS = 20;
    public static final int AVAILABLE_POINTS = 15;
    // Resolving this many incidents in the category earns full experience points.
    public static final int EXPERIENCE_CAP = 5;

    public TechnicianScore score(Technician tech, Category category, int resolvedInCategory) {
        if (tech == null) {
            throw new NullPointerException("technician is required");
        }
        if (category == null) {
            throw new NullPointerException("category is required");
        }
        if (resolvedInCategory < 0) {
            throw new IllegalArgumentException("resolvedInCategory cannot be negative");
        }
        List<String> reasons = new ArrayList<>();
        int points = 0;

        if (tech.hasSkill(category)) {
            points += SKILL_POINTS;
            reasons.add("Has the " + category.getName() + " skill (+" + SKILL_POINTS + ")");
        } else {
            reasons.add("No " + category.getName() + " skill (+0)");
        }

        int spare = tech.getMaxWorkload() - tech.getActiveIncidents();
        if (tech.canTakeMoreWork()) {
            int capacity = (int) Math.round(CAPACITY_POINTS * (double) spare / tech.getMaxWorkload());
            points += capacity;
            reasons.add("Spare capacity " + spare + "/" + tech.getMaxWorkload() + " (+" + capacity + ")");
        } else {
            reasons.add("Cannot take more work (" + tech.getActiveIncidents() + "/" + tech.getMaxWorkload() + ") (+0)");
        }

        int experience = (int) Math.round(EXPERIENCE_POINTS * (double) Math.min(resolvedInCategory, EXPERIENCE_CAP) / EXPERIENCE_CAP);
        points += experience;
        reasons.add("Resolved " + resolvedInCategory + " " + category.getName() + " incident(s) (+" + experience + ")");

        if (tech.isAvailable()) {
            points += AVAILABLE_POINTS;
            reasons.add("Available (+" + AVAILABLE_POINTS + ")");
        } else {
            reasons.add("Marked unavailable (+0)");
        }
        return new TechnicianScore(tech, points, List.copyOf(reasons));
    }

    // Available technicians first (an unavailable one is never recommended first), then highest score, then name.
    public List<TechnicianScore> rank(List<TechnicianScore> scores, int limit) {
        List<TechnicianScore> sorted = new ArrayList<>(scores);
        sorted.sort(Comparator.comparing((TechnicianScore s) -> !s.technician().isAvailable())
                .thenComparing(Comparator.comparingInt(TechnicianScore::points).reversed())
                .thenComparing(s -> s.technician().getName()));
        if (sorted.size() > limit) {
            return List.copyOf(sorted.subList(0, limit));
        }
        return List.copyOf(sorted);
    }
}
