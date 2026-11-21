package com.itsm.service.intelligence;

import com.itsm.domain.Category;
import com.itsm.domain.Technician;
import org.junit.jupiter.api.Test;

import java.util.List;

import static com.itsm.domain.IncidentTestData.giveActiveIncidents;
import static org.junit.jupiter.api.Assertions.assertEquals;

class TechnicianScorerTest {

    private static final Category NETWORK = new Category("NETWORK", "Network");

    private final TechnicianScorer scorer = new TechnicianScorer();

    private static Technician tech(String name, boolean networkSkill, int max) {
        Technician t = new Technician("U-" + name, name, name + "@test.local", "hash", max);
        if (networkSkill) {
            t.addSkill(NETWORK);
        }
        return t;
    }

    @Test
    void perfectTechnicianScores100() {
        // skill 40 + capacity 25 (0/4 busy) + experience 20 (5 resolved) + available 15
        assertEquals(100, scorer.score(tech("A", true, 4), NETWORK, 5).points());
    }

    @Test
    void experienceIsCappedAtFive() {
        assertEquals(100, scorer.score(tech("A", true, 4), NETWORK, 50).points());
        assertEquals(84, scorer.score(tech("B", true, 4), NETWORK, 1).points()); // 40 + 25 + 4 + 15
    }

    @Test
    void capacityIsProportionalToSpareSlots() {
        Technician t = tech("A", false, 4);
        giveActiveIncidents(t, 3); // 1 of 4 slots free -> 25 * 1/4 = 6.25 -> 6
        assertEquals(6 + 15, scorer.score(t, NETWORK, 0).points());
    }

    @Test
    void fullTechnicianGetsNoCapacityPoints() {
        Technician t = tech("A", true, 2);
        giveActiveIncidents(t, 2);
        assertEquals(40 + 0 + 0 + 15, scorer.score(t, NETWORK, 0).points());
    }

    @Test
    void unavailableTechnicianGetsNoCapacityOrAvailabilityPoints() {
        Technician t = tech("A", true, 4);
        t.setAvailable(false);
        assertEquals(40 + 20, scorer.score(t, NETWORK, 5).points());
    }

    @Test
    void unavailableTechnicianIsRankedLastEvenWithTheHighestScore() {
        Technician star = tech("Star", true, 4);
        star.setAvailable(false); // 60 points
        Technician weak = tech("Weak", false, 4); // 25 + 15 = 40 points
        Technician good = tech("Good", true, 4); // 80 points
        List<TechnicianScore> ranked = scorer.rank(List.of(
                scorer.score(star, NETWORK, 5), scorer.score(weak, NETWORK, 0), scorer.score(good, NETWORK, 0)), 3);
        assertEquals("Good", ranked.get(0).technician().getName());
        assertEquals("Weak", ranked.get(1).technician().getName());
        assertEquals("Star", ranked.get(2).technician().getName());
    }

    @Test
    void rankKeepsOnlyTheLimit() {
        List<TechnicianScore> scores = List.of(scorer.score(tech("A", true, 4), NETWORK, 0),
                scorer.score(tech("B", true, 4), NETWORK, 0), scorer.score(tech("C", true, 4), NETWORK, 0),
                scorer.score(tech("D", true, 4), NETWORK, 0));
        assertEquals(3, scorer.rank(scores, 3).size());
    }
}
