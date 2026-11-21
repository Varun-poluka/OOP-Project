package com.itsm.service.intelligence;

import com.itsm.domain.ITService;
import com.itsm.domain.Incident;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static com.itsm.domain.IncidentTestData.reported;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TokenSimilarityDuplicateDetectorTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 1, 10, 9, 0);
    private static final ITService EMAIL = new ITService("Email", 2);
    private static final ITService LMS = new ITService("LMS", 2);

    private final TokenSimilarityDuplicateDetector detector = new TokenSimilarityDuplicateDetector();

    private static Incident open(String title, String description, String category, ITService service) {
        return reported(title, description, category, service, NOW.minusHours(1), false);
    }

    @Test
    void tokensAreLowercasedWithoutPunctuationOrStopWords() {
        assertEquals(Set.of("email", "down", "again"), TokenSimilarityDuplicateDetector.tokens("The Email is DOWN... again!"));
    }

    @Test
    void jaccardOfTwoEmptySetsIsZero() {
        assertEquals(0.0, TokenSimilarityDuplicateDetector.jaccard(Set.of(), Set.of()));
    }

    @Test
    void jaccardIsIntersectionOverUnion() {
        // {email, down} vs {email, slow}: 1 shared word out of 3 distinct words.
        assertEquals(1.0 / 3, TokenSimilarityDuplicateDetector.jaccard(Set.of("email", "down"), Set.of("email", "slow")), 1e-9);
    }

    @Test
    void scoreUsesWeightsAndBonuses() {
        Incident other = open("email down", "outlook fails", "APPLICATION", EMAIL);
        // title 1.0 * 0.6 + description 0 * 0.4 + category 0.15 = 0.75 (different service)
        DuplicateMatch match = detector.score(new IncidentText("Email down", "no idea", "APPLICATION", "LMS"), other);
        assertEquals(0.75, match.score(), 1e-9);
        assertTrue(match.reasons().contains("Same category APPLICATION"));
    }

    @Test
    void scoreIsCappedAtOne() {
        Incident other = open("email down", "outlook fails", "APPLICATION", EMAIL);
        DuplicateMatch match = detector.score(new IncidentText("Email down", "Outlook fails", "APPLICATION", "Email"), other);
        assertEquals(1.0, match.score(), 1e-9); // 0.6 + 0.4 + 0.15 + 0.15 = 1.3, capped
    }

    @Test
    void belowThresholdIsNotADuplicate() {
        Incident other = open("printer jammed", "paper stuck", "HARDWARE", LMS);
        assertTrue(detector.findDuplicates(new IncidentText("Email down", "outlook", "APPLICATION", "Email"),
                List.of(other), NOW).isEmpty());
    }

    @Test
    void finishedAndOldIncidentsAreIgnored() {
        Incident resolved = reported("email down", "outlook fails", "APPLICATION", EMAIL, NOW.minusHours(1), true);
        Incident old = reported("email down", "outlook fails", "APPLICATION", EMAIL, NOW.minusDays(8), false);
        assertTrue(detector.findDuplicates(new IncidentText("Email down", "Outlook fails", "APPLICATION", "Email"),
                List.of(resolved, old), NOW).isEmpty());
    }

    @Test
    void returnsTopThreeSortedByScore() {
        Incident best = open("email down", "outlook fails", "APPLICATION", EMAIL);  // 1.3 capped to 1.0
        Incident second = open("email down", "other text", "APPLICATION", EMAIL);   // 0.6 + 0.15 + 0.15 = 0.90
        Incident third = open("email down", "outlook slow", "APPLICATION", LMS);    // 0.6 + 0.4/3 + 0.15 = 0.88
        Incident fourth = open("email down", "other text", "NETWORK", LMS);         // 0.60: above 0.5 but 4th
        List<DuplicateMatch> matches = detector.findDuplicates(
                new IncidentText("Email down", "Outlook fails", "APPLICATION", "Email"),
                List.of(fourth, third, second, best), NOW);
        assertEquals(3, matches.size());
        assertEquals(best, matches.get(0).incident());
        assertEquals(second, matches.get(1).incident());
        assertEquals(third, matches.get(2).incident());
    }
}
