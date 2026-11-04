package com.itsm;
import com.itsm.domain.*;
import com.itsm.domain.exception.InvalidStateTransitionException;
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

        Employee ravi = new Employee("E200", "Ravi", "ravi2@corp.com", "h1");
        Technician arjun = new Technician("T300", "Arjun", "arjun2@corp.com", "h2", 3);
        Category net = new Category("Network", "");
        ITService pay = new ITService("Payment App", 3);

        Incident inc = new Incident("INC-1024", "Payment app down", "503 on checkout",
                ravi, net, pay, Impact.HIGH, Urgency.HIGH);

        inc.classify(Priority.P1);
        inc.assignTo(arjun);
        inc.acknowledge(arjun);
        inc.startWork(arjun);
        inc.addNote(arjun, "Connection pool exhausted");
        inc.resolve(arjun, "Restarted pool, raised limit");
        inc.verify(ravi);
        inc.close(ravi);

        for (AuditRecord r : inc.getAuditTrail()) {
            System.out.println(r);
        }
        System.out.println("Final status: " + inc.getStatus());
        System.out.println("Arjun's workload: " + arjun.getActiveIncidents());

        Incident fresh = new Incident("INC-1025", "VPN slow", "", ravi, net, pay, Impact.LOW, Urgency.LOW);
        try {
            fresh.close(ravi);
        } catch (InvalidStateTransitionException ex) {
            System.out.println("Blocked: " + ex.getMessage());
        }
    }
}