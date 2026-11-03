package com.itsm;
import com.itsm.domain.*;

public class Main{
    public static void main(String [] args){
        User e = new Employee("E102", "Ravi Kumar", "ravi@copr.com", "hash123");
        User a = new Administrator("A001", "Priya", "PRIYA@corp.com", "hash999");

        System.out.println(e);
        System.out.println(a);
        System.out.println(a.getEmail());

        try{
            new Employee ("E103", "Bad Email", "not an email", "hash");
        }
        catch(IllegalArgumentException ex){
            System.out.println("Rejected: " + ex.getMessage());
        }
    }
}