package com.itsm.domain;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
public class InvestigationNote {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // A technician (investigation note) or the incident's reporter (a comment). The column points
    // at the users table either way, because all user types share one table.
    @ManyToOne
    private User author;
    @Column(length = 2000)
    private String text;
    private LocalDateTime createdAt;

    protected InvestigationNote(){}

    public InvestigationNote(User author, String text){
        if(author == null){
            throw new NullPointerException("Note Author is required");
        }
        if(text == null || text.isBlank()) {
            throw new IllegalArgumentException("Text cannot be empty");
        }
        this.author = author;
        this.text = text.trim();
        createdAt = LocalDateTime.now();
    }

    public User getAuthor(){
        return author;
    }

    // Only the reporter (an Employee) and technicians write notes, so the author's type tells them apart.
    public boolean isFromReporter(){
        return author instanceof Employee;
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
