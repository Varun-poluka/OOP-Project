package com.itsm.domain;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
public class InvestigationNote {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private Technician author;
    @Column(length = 2000)
    private String text;
    private LocalDateTime createdAt;

    protected InvestigationNote(){}

    public InvestigationNote(Technician author, String text){
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
