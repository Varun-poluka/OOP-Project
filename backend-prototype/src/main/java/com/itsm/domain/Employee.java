package com.itsm.domain;
import java.util.*;

public class Employee extends User {
    public Employee(String id, String name, String email, String passwordHash){
        super(id, name, email, passwordHash);
    }

    public String getRole(){
        return "EMPLOYEE";
    }
}
