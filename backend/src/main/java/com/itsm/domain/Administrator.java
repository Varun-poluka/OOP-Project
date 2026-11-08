package com.itsm.domain;
import jakarta.persistence.*;

@Entity
@DiscriminatorValue("ADMINISTRATOR")
public class Administrator extends User {
    public Administrator(){}

    public Administrator (String id, String name, String email, String passwordHash){
        super(id, name, email, passwordHash);
    }

    @Override
    public String getRole(){
        return "ADMINISTRATOR";
    }
}
