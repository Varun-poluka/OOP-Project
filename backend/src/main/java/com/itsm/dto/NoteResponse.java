package com.itsm.dto;

import com.itsm.domain.InvestigationNote;

import java.time.LocalDateTime;

public record NoteResponse(
        String authorName,
        String text,
        LocalDateTime createdAt,
        // true for the reporter's comments, false for the technician's investigation notes
        boolean fromReporter
) {
    public static NoteResponse from(InvestigationNote note) {
        return new NoteResponse(
                note.getAuthor().getName(),
                note.getText(),
                note.getCreatedAt(),
                note.isFromReporter());
    }
}
