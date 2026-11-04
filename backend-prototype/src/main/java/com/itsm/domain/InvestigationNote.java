package com.itsm.domain;
import java.time.LocalDateTime;

public class InvestigationNote {
    private final Technician author;
    private final String text;
    private final LocalDateTime createdAt;

    public InvestigationNote(Technician author, String text){
        if(author == null){
            throw new NullPointerException("Note Author ie required");
        }
        if(text == null || text.isBlank()) {
            throw new IllegalArgumentException("Text cannot be empty");
        }
        this.author = author;
        this.text = text.trim();
        createdAt = LocalDateTime.now();
    }

    public Technician getAuthor(){
        return author;
    }
    public String getText(){
        return text;
    }
    public LocalDateTime getCreatedAt(){
        return createdAt;
    }

    @Override
    public String toString(){
        return "[" + createdAt + "]" + " " + author.getName() + ": " + text;
    }
}
