package com.itsm.domain;
import java.util.*;

public class Administrator extends User {
    public Administrator (String id, String name, String email, String passwordHash){
        super(id, name, email, passwordHash);
    }

    public String getRole(){
        return "ADMINISTRATOR";
    }
}
