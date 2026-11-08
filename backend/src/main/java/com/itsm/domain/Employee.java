package com.itsm.domain;
import jakarta.persistence.*;

@Entity
@DiscriminatorValue("EMPLOYEE")
public class Employee extends User {
    public Employee(){}

    public Employee(String id, String name, String email, String passwordHash){
        super(id, name, email, passwordHash);
    }

    @Override
    public String getRole(){
        return "EMPLOYEE";
    }
}
