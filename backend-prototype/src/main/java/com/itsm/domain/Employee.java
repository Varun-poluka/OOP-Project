package com.itsm.domain;

public class Employee extends User {
    public Employee(String id, String name, String email, String passwordHash){
        super(id, name, email, passwordHash);
    }

    @Override
    public String getRole(){
        return "EMPLOYEE";
    }
}
