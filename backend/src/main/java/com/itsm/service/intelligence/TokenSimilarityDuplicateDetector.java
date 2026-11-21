package com.itsm.service.intelligence;

import com.itsm.domain.Incident;
import com.itsm.domain.IncidentStatus;

import java.time.LocalDateTime;
import java.util.*;

// Compares word sets with Jaccard similarity: |A ∩ B| / |A ∪ B|.
public class TokenSimilarityDuplicateDetector implements DuplicateDetector {

    public static final double TITLE_WEIGHT = 0.6;
    public static final double DESCRIPTION_WEIGHT = 0.4;
    public static final double SAME_CATEGORY_BONUS = 0.15;
    public static final double SAME_SERVICE_BONUS = 0.15;
    public static final double THRESHOLD = 0.5;
    public static final int MAX_RESULTS = 3;
    public static final int WINDOW_DAYS = 7;

    private static final Set<IncidentStatus> FINISHED =
            EnumSet.of(IncidentStatus.RESOLVED, IncidentStatus.VERIFIED, IncidentStatus.CLOSED);

    private static final Set<String> STOP_WORDS = Set.of(
            "a", "an", "the", "and", "or", "but", "is", "are", "was", "were", "be", "been", "am",
            "i", "me", "my", "we", "our", "you", "it", "its", "this", "that", "these", "those",
            "to", "of", "in", "on", "at", "for", "with", "from", "by", "as", "not", "no",
            "can", "cannot", "can't", "do", "does", "did", "has", "have", "had", "will", "would",
            "there", "here", "when", "while", "so", "very", "just", "please", "any", "all");

    @Override
    public List<DuplicateMatch> findDuplicates(IncidentText probe, List<Incident> candidates, LocalDateTime now) {
        if (probe == null) {
            throw new NullPointerException("probe is required");
        }
        if (candidates == null) {
            throw new NullPointerException("candidates are required");
        }
        if (now == null) {
            throw new NullPointerException("now is required");
        }
        LocalDateTime cutoff = now.minusDays(WINDOW_DAYS);
        List<DuplicateMatch> matches = new ArrayList<>();
        for (Incident incident : candidates) {
            if (FINISHED.contains(incident.getStatus()) || incident.getCreatedAt().isBefore(cutoff)) {
                continue;
            }
            DuplicateMatch match = score(probe, incident);
            if (match.score() >= THRESHOLD) {
                matches.add(match);
            }
        }
        matches.sort(Comparator.comparingDouble(DuplicateMatch::score).reversed());
        if (matches.size() > MAX_RESULTS) {
            return List.copyOf(matches.subList(0, MAX_RESULTS));
        }
        return List.copyOf(matches);
    }

    DuplicateMatch score(IncidentText probe, Incident incident) {
        IncidentText other = IncidentText.of(incident);
        List<String> reasons = new ArrayList<>();

        double title = jaccard(tokens(probe.title()), tokens(other.title()));
        double description = jaccard(tokens(probe.description()), tokens(other.description()));
        double score = TITLE_WEIGHT * title + DESCRIPTION_WEIGHT * description;
        if (title > 0) {
            reasons.add("Similar title (" + percent(title) + "% word overlap)");
        }
        if (description > 0) {
            reasons.add("Similar description (" + percent(description) + "% word overlap)");
        }
        if (probe.categoryName() != null && probe.categoryName().equalsIgnoreCase(other.categoryName())) {
            score += SAME_CATEGORY_BONUS;
            reasons.add("Same category " + other.categoryName());
        }
        if (probe.serviceName() != null && probe.serviceName().equals(other.serviceName())) {
            score += SAME_SERVICE_BONUS;
            reasons.add("Same affected service " + other.serviceName());
        }
        score = Math.min(score, 1.0);
        return new DuplicateMatch(incident, score, List.copyOf(reasons));
    }

    // Lowercase, turn punctuation into spaces, split on whitespace, drop stop words.
    static Set<String> tokens(String text) {
        Set<String> result = new HashSet<>();
        if (text == null) {
            return result;
        }
        String cleaned = text.toLowerCase().replaceAll("[^a-z0-9\\s]", " ");
        for (String word : cleaned.split("\\s+")) {
            if (!word.isEmpty() && !STOP_WORDS.contains(word)) {
                result.add(word);
            }
        }
        return result;
    }

    // Two empty sets share nothing, so their similarity is 0 (not 0/0).
    static double jaccard(Set<String> a, Set<String> b) {
        if (a.isEmpty() && b.isEmpty()) {
            return 0.0;
        }
        Set<String> intersection = new HashSet<>(a);
        intersection.retainAll(b);
        Set<String> union = new HashSet<>(a);
        union.addAll(b);
        return (double) intersection.size() / union.size();
    }

    private static long percent(double value) {
        return Math.round(value * 100);
    }
}
