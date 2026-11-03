package com.itsm;
import com.itsm.domain.*;
import com.itsm.domain.exception.TechnicianUnavailableException;

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

        Category network = new Category("network", "Routers, Wi-Fi, VPN");
        Category database = new Category("Database", "PostgreSQL, backups");

        ITService db = new ITService("Database Cluster", 3);
        ITService payment = new ITService("Payment App", 3);
        payment.addDependency(db);
        System.out.println(payment + " depends on " + payment.getDependencies());

        Technician t = new Technician("T205", "Arjun", "arjun@corp.com", "hashT", 2);
        t.addSkill(network);
        t.addSkill(new Category("NETWORK", "duplicate"));
        System.out.println("Skills: " + t.getSkills());
        System.out.println("Has network skill? " + t.hasSkill(new Category("Network", "")));
        System.out.println("Has database skill? " + t.hasSkill(database));

        t.addIncident();
        t.addIncident();
        System.out.println("Workload: " + t.getActiveIncidents() + "/" + t.getMaxWorkload());
        try {
            t.addIncident();
        } catch (TechnicianUnavailableException ex) {
            System.out.println("Blocked: " + ex.getMessage());
        }

        System.out.println("Impact HIGH weight = " + Impact.HIGH.getWeight());
    }
}