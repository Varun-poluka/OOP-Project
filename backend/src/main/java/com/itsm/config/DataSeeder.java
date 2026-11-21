package com.itsm.config;

import com.itsm.domain.*;
import com.itsm.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

// Runs first (@Order(1)): DemoDataLoader (@Order(2)) needs the SLA policies and the service graph.
@Component
@Order(1)
public class DataSeeder implements CommandLineRunner {

    // Demo password for every seeded user (listed in README). Only its BCrypt hash is stored.
    private static final String DEMO_PASSWORD = "password123";

    private final UserRepository userRepository;
    private final TechnicianRepository technicianRepository;
    private final CategoryRepository categoryRepository;
    private final ITServiceRepository itServiceRepository;
    private final IncidentRepository incidentRepository;
    private final SLAPolicyRepository slaPolicyRepository;
    private final PasswordEncoder passwordEncoder;
    private final Environment environment;

    public DataSeeder(UserRepository userRepository,
                      TechnicianRepository technicianRepository,
                      CategoryRepository categoryRepository,
                      ITServiceRepository itServiceRepository,
                      IncidentRepository incidentRepository,
                      SLAPolicyRepository slaPolicyRepository,
                      PasswordEncoder passwordEncoder,
                      Environment environment){
        this.userRepository = userRepository;
        this.technicianRepository = technicianRepository;
        this.categoryRepository = categoryRepository;
        this.itServiceRepository = itServiceRepository;
        this.incidentRepository = incidentRepository;
        this.slaPolicyRepository = slaPolicyRepository;
        this.passwordEncoder = passwordEncoder;
        this.environment = environment;
    }

    @Override
    @Transactional
    public void run(String... args){
        if (slaPolicyRepository.count() == 0) {
            slaPolicyRepository.save(new SLAPolicy(Priority.P1, 5, 30));
            slaPolicyRepository.save(new SLAPolicy(Priority.P2, 15, 120));
            slaPolicyRepository.save(new SLAPolicy(Priority.P3, 60, 480));
            slaPolicyRepository.save(new SLAPolicy(Priority.P4, 240, 1440));
        }
        if(userRepository.count() > 0){
            backfillPasswordHashes();
            System.out.println("DataSeeder: users already exist, skipping demo users and incident");
        } else if (environment.matchesProfiles("demo")) {
            System.out.println("DataSeeder: demo profile active, DemoDataLoader seeds users and incidents");
        } else {
            seedDemoData();
        }
        seedServiceGraph();
    }

    private void seedDemoData(){
        String demoHash = passwordEncoder.encode(DEMO_PASSWORD);

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
                new Employee("U-EMP-1", "Asha Employee", "employee@itsm.local", demoHash));
        userRepository.save(
                new Administrator("U-ADM-1", "Ravi Admin", "admin@itsm.local", demoHash));

        Technician databaseTech = new Technician("U-TEC-1", "Dev Database", "db.tech@itsm.local", demoHash, 3);
        databaseTech.addSkill(database);
        databaseTech = technicianRepository.save(databaseTech);

        Technician networkTech = new Technician("U-TEC-2", "Neha Network", "net.tech@itsm.local", demoHash, 3);
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

    // A campus IT dependency graph. "A -> B" means A depends on B, so an outage of B impacts A.
    // Runs on every start: it only creates missing services and missing edges, never deletes anything.
    // DNS -> Monitoring -> Network -> DNS is a deliberate cycle (DNS failover is driven by monitoring),
    // which proves the impact search terminates on cycles.
    private void seedServiceGraph(){
        ITService dns = findOrCreateService("DNS", 3);
        ITService network = findOrCreateService("Network", 3);
        ITService sso = findOrCreateService("SSO", 3);
        ITService email = findOrCreateService("Email", 2);
        ITService lms = findOrCreateService("LMS", 2);
        ITService erp = findOrCreateService("ERP", 3);
        ITService databaseCluster = findOrCreateService("Database Cluster", 3);
        ITService payroll = findOrCreateService("Payroll", 2);
        ITService paymentApp = findOrCreateService("Payment App", 3);
        ITService monitoring = findOrCreateService("Monitoring", 1);

        // addDependency ignores an edge that already exists. Changes to managed entities are
        // saved when run()'s transaction commits.
        network.addDependency(dns);
        sso.addDependency(network);
        email.addDependency(sso);
        lms.addDependency(sso);
        erp.addDependency(sso);
        erp.addDependency(databaseCluster);
        payroll.addDependency(erp);
        paymentApp.addDependency(databaseCluster);
        monitoring.addDependency(network);
        dns.addDependency(monitoring);
    }

    private ITService findOrCreateService(String name, int businessCriticality){
        return itServiceRepository.findByName(name)
                .orElseGet(() -> itServiceRepository.save(new ITService(name, businessCriticality)));
    }

    // Users saved before login existed have placeholder hashes such as "hash-employee".
    // A real BCrypt hash always starts with "$2", so anything else gets the demo password.
    // Runs inside run()'s transaction: changing a loaded entity is saved automatically.
    private void backfillPasswordHashes() {
        int updated = 0;
        for (User user : userRepository.findAll()) {
            String hash = user.getPasswordHash();
            if (hash == null || !hash.startsWith("$2")) {
                user.changePasswordHash(passwordEncoder.encode(DEMO_PASSWORD));
                updated++;
            }
        }
        if (updated > 0) {
            System.out.println("DataSeeder: set demo passwords for " + updated + " existing users");
        }
    }
}
