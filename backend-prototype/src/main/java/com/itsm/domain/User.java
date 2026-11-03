package com.itsm.domain;
import java.util.*;

public abstract class User {
    private final String id;
    private String name;
    private String email;
    private String passwordHash;

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
        if(name == null || name.isEmpty()){
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

    public boolean checkPassword(String hash){
        return passwordHash.equals(hash);
    }

    @Override
    public String toString() {
        return getRole() + "[" + id + ", " + name + "]";
    }
}
