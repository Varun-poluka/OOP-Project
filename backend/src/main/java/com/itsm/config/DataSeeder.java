package com.itsm.config;

import com.itsm.domain.*;
import com.itsm.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final TechnicianRepository technicianRepository;
    private final CategoryRepository categoryRepository;
    private final ITServiceRepository itServiceRepository;
    private final IncidentRepository incidentRepository;

    public DataSeeder(UserRepository userRepository,
                      TechnicianRepository technicianRepository,
                      CategoryRepository categoryRepository,
                      ITServiceRepository itServiceRepository,
                      IncidentRepository incidentRepository){
        this.userRepository = userRepository;
        this.technicianRepository = technicianRepository;
        this.categoryRepository = categoryRepository;
        this.itServiceRepository = itServiceRepository;
        this.incidentRepository = incidentRepository;
    }

    @Override
    @Transactional
    public void run(String... args){
        if(userRepository.count() > 0){
            System.out.println("DataSeeder: users already exist, skipping seed");
            return;
        }

        // Categories: save() returns the managed copy, so always keep the returned object
        Category network = categoryRepository.save(new Category("NETWORK", "Network and connectivity issues"));
        Category database = categoryRepository.save(new Category("DATABASE", "Database issues"));
        Category application = categoryRepository.save(new Category("APPLICATION", "Application issues"));
        Category hardware = categoryRepository.save(new Category("HARDWARE", "Hardware issues"));

        // Services: Database Cluster must exist before Payment App can depend on it
        ITService databaseCluster = itServiceRepository.save(new ITService("Database Cluster", 3));

        ITService paymentApp = new ITService("Payment App", 3);
        paymentApp.addDependency(databaseCluster);
        paymentApp = itServiceRepository.save(paymentApp);

        itServiceRepository.save(new ITService("Email", 2));

        // Users
        Employee employee = (Employee) userRepository.save(
                new Employee("U-EMP-1", "Asha Employee", "employee@itsm.local", "hash-employee"));
        userRepository.save(
                new Administrator("U-ADM-1", "Ravi Admin", "admin@itsm.local", "hash-admin"));

        Technician databaseTech = new Technician("U-TEC-1", "Dev Database", "db.tech@itsm.local", "hash-tech1", 3);
        databaseTech.addSkill(database);
        databaseTech = technicianRepository.save(databaseTech);

        Technician networkTech = new Technician("U-TEC-2", "Neha Network", "net.tech@itsm.local", "hash-tech2", 3);
        networkTech.addSkill(network);
        networkTech.addSkill(hardware);
        technicianRepository.save(networkTech);

        // Incident: created as NEW, then classified and assigned through its lifecycle methods
        Incident incident = new Incident("INC-0001",
                "Payment App cannot reach database",
                "Payments fail with a connection timeout to the Database Cluster",
                employee, database, paymentApp, Impact.HIGH, Urgency.HIGH);
        incident.classify(Priority.P1);
        incident.assignTo(databaseTech);

        incidentRepository.save(incident);
        technicianRepository.save(databaseTech);   // stores activeIncidents = 1

        System.out.println("DataSeeder: sample data loaded");
    }
}
