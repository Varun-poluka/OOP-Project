package com.itsm.service.notification;

import com.itsm.domain.event.IncidentEvent;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Turns an IncidentEvent into the text a person reads in a notification or email:
// "INC-0026 (Lab 3 PCs stuck): Response SLA breached: not acknowledged by 20 Nov, 1:26 PM".
// Pure: no Spring, no database, the same input always gives the same text.
//
// The audit descriptions stay as they are (they are data). Some details exist only inside them:
// the SLA due time ("Not Acknowledged by 2026-11-20T13:26:22", written by Incident.checkSla) and the
// impacted services ("... may impact: SSO (1 hop), ...", written by IncidentService.report). Those
// formats are read here; if a marker is missing, the description is shown unchanged instead.
// NotificationMessageFormatterTest runs real Incident descriptions through this class, so a change
// to those texts fails a test.
public final class NotificationMessageFormatter {

    // Notification.message is a 500-character column.
    static final int MAX_LENGTH = 500;
    static final int MAX_SERVICES_LISTED = 3;

    // Locale.ENGLISH so it is always "Nov" and "PM", whatever the server's language is.
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("d MMM, h:mm a", Locale.ENGLISH);
    // LocalDateTime.toString(): 2026-11-20T13:26 or 2026-11-20T13:26:22 or with fractions of a second.
    private static final Pattern ISO_TIME = Pattern.compile("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}(:\\d{2}(\\.\\d{1,9})?)?");
    // " (1 hop)" / " (2 hops)" after a service name in the SERVICE_IMPACT description.
    private static final Pattern HOPS = Pattern.compile(" \\(\\d+ hops?\\)$");

    private NotificationMessageFormatter() { }

    // forAssignedTechnician: the recipient is the incident's technician, so "Assigned to you".
    public static String format(IncidentEvent event, boolean forAssignedTechnician) {
        if (event == null) {
            throw new NullPointerException("event is required");
        }
        String text = event.incidentId() + " (" + event.incidentTitle() + "): " + body(event, forAssignedTechnician);
        if (text.length() > MAX_LENGTH) {
            return text.substring(0, MAX_LENGTH - 3) + "...";
        }
        return text;
    }

    private static String body(IncidentEvent event, boolean forAssignedTechnician) {
        String description = (event.description() == null) ? "" : event.description();
        String actor = event.actorName();
        return switch (event.action()) {
            case "CREATED" -> "Reported by " + actor;
            case "CLASSIFIED" -> "Classified as " + after(description, "Priority set to: ");
            case "ASSIGNED" -> forAssignedTechnician ? "Assigned to you" : description;
            case "REASSIGNED" -> forAssignedTechnician ? reassignedToYou(description) : description;
            case "ACKNOWLEDGED" -> "Acknowledged by " + actor;
            case "STARTED" -> "Work started by " + actor;
            case "NOTE_ADDED" -> "New note from " + actor + ": " + description;
            case "RESOLVED" -> "Resolved by " + actor + ": " + description;
            case "VERIFIED" -> "Verified by " + actor;
            case "CLOSED" -> "Closed by " + actor;
            case "REOPENED" -> "Reopened by " + actor + ": " + after(description, "Reopened: ");
            case "SLA_RESPONSE_BREACHED" -> sla("Response SLA breached", "not acknowledged by", description);
            case "SLA_RESOLUTION_BREACHED" -> sla("Resolution SLA breached", "not resolved by", description);
            case "SLA_RESPONSE_AT_RISK" -> sla("Response SLA at risk", "response due by", description);
            case "SLA_RESOLUTION_AT_RISK" -> sla("Resolution SLA at risk", "resolution due by", description);
            case "PRIORITY_RAISED" -> priorityRaised(description);
            case "SERVICE_IMPACT" -> "Service impact: " + serviceImpact(description);
            default -> sentenceCase(event.action()) + (description.isEmpty() ? "" : ": " + description);
        };
    }

    // "Not Acknowledged by 2026-11-20T13:26:22" -> "Response SLA breached: not acknowledged by 20 Nov, 1:26 PM"
    private static String sla(String label, String wording, String description) {
        Matcher matcher = ISO_TIME.matcher(description);
        if (!matcher.find()) {
            return label + ": " + description;
        }
        return label + ": " + wording + " " + LocalDateTime.parse(matcher.group()).format(TIME);
    }

    // "Reassigned from Arjun Apps to Kiran Support" -> "Reassigned to you (from Arjun Apps)"
    private static String reassignedToYou(String description) {
        String prefix = "Reassigned from ";
        int to = description.lastIndexOf(" to ");
        if (!description.startsWith(prefix) || to < prefix.length()) {
            return "Reassigned to you";
        }
        return "Reassigned to you (from " + description.substring(prefix.length(), to) + ")";
    }

    // "Raised from P3 to P2: an outage of Network impacts 11 dependent services"
    // -> "Priority raised from P3 to P2: an outage of Network impacts 11 dependent services"
    private static String priorityRaised(String description) {
        if (description.startsWith("Raised ")) {
            return "Priority raised " + description.substring("Raised ".length());
        }
        return "Priority raised: " + description;
    }

    // "An outage of Network may impact: SSO (1 hop), Monitoring (1 hop), ..."
    // -> "an outage of Network may affect SSO, Monitoring, Campus Wi-Fi and 8 more"
    private static String serviceImpact(String description) {
        String marker = " may impact: ";
        int at = description.indexOf(marker);
        if (at < 0) {
            return description;
        }
        List<String> names = new ArrayList<>();
        for (String item : description.substring(at + marker.length()).split(", ")) {
            names.add(HOPS.matcher(item).replaceAll(""));
        }
        return lowerFirst(description.substring(0, at)) + " may affect " + listOf(names);
    }

    // [A] -> "A"; [A, B] -> "A and B"; [A, B, C] -> "A, B and C"; 5 names -> "A, B, C and 2 more"
    static String listOf(List<String> names) {
        if (names.isEmpty()) {
            return "";
        }
        if (names.size() > MAX_SERVICES_LISTED) {
            return String.join(", ", names.subList(0, MAX_SERVICES_LISTED))
                    + " and " + (names.size() - MAX_SERVICES_LISTED) + " more";
        }
        if (names.size() == 1) {
            return names.get(0);
        }
        return String.join(", ", names.subList(0, names.size() - 1)) + " and " + names.get(names.size() - 1);
    }

    // The text after the marker, or the whole text if the marker is not there.
    private static String after(String text, String marker) {
        if (text.startsWith(marker)) {
            return text.substring(marker.length());
        }
        return text;
    }

    private static String lowerFirst(String text) {
        if (text.isEmpty()) {
            return text;
        }
        return Character.toLowerCase(text.charAt(0)) + text.substring(1);
    }

    // "SOME_NEW_ACTION" -> "Some new action"
    private static String sentenceCase(String code) {
        String words = code.replace('_', ' ').toLowerCase(Locale.ENGLISH);
        if (words.isEmpty()) {
            return words;
        }
        return Character.toUpperCase(words.charAt(0)) + words.substring(1);
    }
}
