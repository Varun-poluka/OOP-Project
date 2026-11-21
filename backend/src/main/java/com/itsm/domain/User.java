package com.itsm.domain;
import jakarta.persistence.*;
import java.util.*;

@Entity
@Table(name = "users")
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "role")
public abstract class User {
    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    protected User() { }

    protected User(String id, String name, String email, String passwordHash){
        if(id == null){
            throw new NullPointerException("id is required");
        }
        if(passwordHash == null){
            throw new NullPointerException("Password is required");
        }
        this.id = id;
        this.passwordHash = passwordHash;
        setName(name);
        setEmail(email);
    }

    public abstract String getRole();

    public String getId(){
        return id;
    }
    public String getName(){
        return name;
    }
    public String getEmail(){
        return email;
    }

    public void setName(String name){
        if(name == null || name.isBlank()){
            throw new IllegalArgumentException("Name cannot be empty");
        }
        this.name = name.trim();
    }

    public void setEmail(String email){
        if(email == null || !email.contains("@")){
            throw new IllegalArgumentException("Invalid Email: " + email);
        }
        this.email = email.trim().toLowerCase();
    }

    // Only the authentication service reads this; it is never copied into a DTO.
    public String getPasswordHash(){
        return passwordHash;
    }

    public void changePasswordHash(String passwordHash){
        if(passwordHash == null || passwordHash.isBlank()){
            throw new IllegalArgumentException("Password hash cannot be empty");
        }
        this.passwordHash = passwordHash;
    }

    @Override
    public String toString() {
        return getRole() + "[" + id + ", " + name + "]";
    }

    @Override
    public boolean equals(Object o){
        if(this == o){
            return true;
        }
        if(!(o instanceof User)){
            return false;
        }
        User other = (User) o;
        return this.id.equals(other.id);
    }

    @Override
    public int hashCode(){
        return id.hashCode();
    }
}
