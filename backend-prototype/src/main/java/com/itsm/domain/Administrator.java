package com.itsm.domain;

public class Administrator extends User {
    public Administrator (String id, String name, String email, String passwordHash){
        super(id, name, email, passwordHash);
    }

    @Override
    public String getRole(){
        return "ADMINISTRATOR";
    }
}
