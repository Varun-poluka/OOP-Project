package com.itsm.config;

import com.itsm.domain.*;
import com.itsm.dto.*;
import com.itsm.repository.*;
import com.itsm.service.DemoDataStatus;
import com.itsm.service.IncidentService;
import com.itsm.service.SlaService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.function.Supplier;

// Demo data for the video, only with the "demo" profile. Runs after DataSeeder (@Order(2)),
// which has already created the SLA policies and the campus service graph.
//
// Every incident is created and moved through its lifecycle by the real IncidentService, so the
// audit trail, technician workloads and notifications are exactly what the app itself produces.
// Those methods stamp LocalDateTime.now(), so each step is followed by a JdbcTemplate UPDATE that
// moves the rows that step created to the time the story says it happened ("backdating").
// The domain is not changed for this: backdating is a property of demo data, not of an incident.
//
// Deliberately NOT @Transactional: each service call commits on its own, so the UPDATE that
// follows sees the committed rows, and the next service call reloads the backdated values.
@Component
@Profile("demo")
@Order(2)
public class DemoDataLoader implements CommandLineRunner {

    private static final String DEMO_PASSWORD = "password123";

    // Employees
    private static final String ASHA = "U-EMP-1";
    private static final String RAHUL = "U-EMP-2";
    private static final String SNEHA = "U-EMP-3";
    private static final String KARTHIK = "U-EMP-4";
    private static final String MEERA = "U-EMP-5";
    private static final String ADITYA = "U-EMP-6";
    private static final String FATIMA = "U-EMP-7";
    private static final String ROHAN = "U-EMP-8";
    // Technicians
    private static final String DEV = "U-TEC-1";
    private static final String NEHA = "U-TEC-2";
    private static final String ARJUN = "U-TEC-3";
    private static final String PRIYA = "U-TEC-4";
    private static final String KIRAN = "U-TEC-5";
    // Administrators
    private static final String RAVI = "U-ADM-1";
    private static final String LAKSHMI = "U-ADM-2";

    private final UserRepository userRepository;
    private final TechnicianRepository technicianRepository;
    private final CategoryRepository categoryRepository;
    private final ITServiceRepository itServiceRepository;
    private final IncidentRepository incidentRepository;
    private final IncidentService incidentService;
    private final SlaService slaService;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbc;
    private final DemoDataStatus demoDataStatus;

    // The moment the loader started; every story time is measured back from it.
    private LocalDateTime now;

    public DemoDataLoader(UserRepository userRepository,
                          TechnicianRepository technicianRepository,
                          CategoryRepository categoryRepository,
                          ITServiceRepository itServiceRepository,
                          IncidentRepository incidentRepository,
                          IncidentService incidentService,
                          SlaService slaService,
                          PasswordEncoder passwordEncoder,
                          JdbcTemplate jdbc,
                          DemoDataStatus demoDataStatus) {
        this.userRepository = userRepository;
        this.technicianRepository = technicianRepository;
        this.categoryRepository = categoryRepository;
        this.itServiceRepository = itServiceRepository;
        this.incidentRepository = incidentRepository;
        this.incidentService = incidentService;
        this.slaService = slaService;
        this.passwordEncoder = passwordEncoder;
        this.jdbc = jdbc;
        this.demoDataStatus = demoDataStatus;
    }

    @Override
    public void run(String... args) {
        try {
            if (userRepository.count() > 0) {
                System.out.println("DemoDataLoader: the database already has users, so no demo data was loaded. "
                        + "Start from clean data with scripts/reset-demo-db.sh");
                return;
            }
            now = LocalDateTime.now().withNano(0);
            seedCategoriesAndServices();
            seedUsers();
            seedIncidents();
            recordSlaState();
            markOldNotificationsRead();
            System.out.println("DemoDataLoader: loaded " + incidentRepository.count() + " demo incidents");
        } finally {
            // Also after a failure, so the SLA scheduler is never blocked for good.
            demoDataStatus.markReady();
        }
    }

    // ===== Reference data =====

    private void seedCategoriesAndServices() {
        categoryRepository.save(new Category("NETWORK", "Wired LAN, campus Wi-Fi, VPN and DNS problems"));
        categoryRepository.save(new Category("DATABASE", "Slow or failing database queries, replication and backups"));
        categoryRepository.save(new Category("APPLICATION", "Errors in campus software: LMS, ERP, email, payroll"));
        categoryRepository.save(new Category("HARDWARE", "Lab PCs, printers, projectors and other physical devices"));
        categoryRepository.save(new Category("SECURITY", "Phishing, malware, suspicious logins and data exposure"));
        categoryRepository.save(new Category("ACCESS", "Accounts, passwords, SSO and permissions"));

        // Extra services on top of DataSeeder's graph, so hardware and Wi-Fi tickets have a realistic target.
        ITService network = service("Network");
        ITService sso = service("SSO");
        createService("Campus Wi-Fi", 2, network);
        createService("VPN", 2, network, sso);
        createService("Lab Workstations", 2, network, sso);
        createService("Printing", 1, network);
        createService("Classroom AV", 1);
    }

    private void createService(String name, int criticality, ITService... dependsOn) {
        ITService created = new ITService(name, criticality);
        for (ITService dependency : dependsOn) {
            created.addDependency(dependency);
        }
        itServiceRepository.save(created);
    }

    private void seedUsers() {
        // BCrypt is slow on purpose, so the hash is computed once and shared by every demo user.
        String hash = passwordEncoder.encode(DEMO_PASSWORD);

        userRepository.save(new Employee(ASHA, "Asha Employee", "employee@itsm.local", hash));
        userRepository.save(new Employee(RAHUL, "Rahul Verma", "rahul.verma@itsm.local", hash));
        userRepository.save(new Employee(SNEHA, "Sneha Iyer", "sneha.iyer@itsm.local", hash));
        userRepository.save(new Employee(KARTHIK, "Karthik Rao", "karthik.rao@itsm.local", hash));
        userRepository.save(new Employee(MEERA, "Meera Nair", "meera.nair@itsm.local", hash));
        userRepository.save(new Employee(ADITYA, "Aditya Singh", "aditya.singh@itsm.local", hash));
        userRepository.save(new Employee(FATIMA, "Fatima Shaikh", "fatima.shaikh@itsm.local", hash));
        userRepository.save(new Employee(ROHAN, "Rohan Das", "rohan.das@itsm.local", hash));

        userRepository.save(new Administrator(RAVI, "Ravi Admin", "admin@itsm.local", hash));
        userRepository.save(new Administrator(LAKSHMI, "Lakshmi Menon", "lakshmi.menon@itsm.local", hash));

        technician(DEV, "Dev Database", "db.tech@itsm.local", hash, 4, "DATABASE", "APPLICATION");
        technician(NEHA, "Neha Network", "net.tech@itsm.local", hash, 5, "NETWORK", "HARDWARE");
        technician(ARJUN, "Arjun Apps", "apps.tech@itsm.local", hash, 6, "APPLICATION", "ACCESS");
        technician(PRIYA, "Priya Security", "sec.tech@itsm.local", hash, 3, "SECURITY", "ACCESS");
        technician(KIRAN, "Kiran Support", "support.tech@itsm.local", hash, 8, "HARDWARE", "NETWORK", "ACCESS");
    }

    private void technician(String id, String name, String email, String hash, int maxWorkload, String... skills) {
        Technician tech = new Technician(id, name, email, hash, maxWorkload);
        for (String skill : skills) {
            tech.addSkill(categoryRepository.findById(skill).orElseThrow());
        }
        technicianRepository.save(tech);
    }

    // ===== Incidents, oldest first so the INC numbers follow the dates =====

    private void seedIncidents() {
        // --- Closed history, 29 to 4 days ago ---
        report(daysAgo(29, 9, 15), RAHUL, "Projector in lecture hall F-105 shows no signal",
                "The projector powers on but says 'No signal' with both HDMI and VGA from the lectern PC.",
                "HARDWARE", "Classroom AV", Impact.MEDIUM, Urgency.MEDIUM)
                .acknowledge(20).start(35).note(50, "HDMI cable at the lectern is damaged near the connector.")
                .resolve(90, "Replaced the HDMI cable and reset the projector input to auto-detect.")
                .verify(240).close(245, RAHUL);
        report(daysAgo(28, 11, 0), SNEHA, "Cannot connect to eduroam on new laptop",
                "Windows 11 laptop keeps asking for credentials for eduroam and then fails to connect.",
                "NETWORK", "Campus Wi-Fi", Impact.LOW, Urgency.MEDIUM)
                .acknowledge(30).start(40)
                .resolve(75, "Installed the campus CA certificate and set the EAP method to PEAP/MSCHAPv2.")
                .verify(600).close(605, SNEHA);
        report(daysAgo(27, 14, 30), KARTHIK, "ERP shows wrong course registration credits",
                "My registration page lists 26 credits but I have registered for 22.",
                "APPLICATION", "ERP", Impact.LOW, Urgency.MEDIUM)
                .acknowledge(45).start(60).note(120, "Two cancelled electives were still counted in the total.")
                .resolve(300, "Cleared the cancelled electives from the registration cache; total now shows 22.")
                .verify(1500).close(1510, RAVI);
        report(daysAgo(26, 10, 5), MEERA, "Library printer prints blank pages",
                "Second floor printer in the library feeds paper but every page comes out blank.",
                "HARDWARE", "Printing", Impact.LOW, Urgency.LOW)
                .acknowledge(90).start(120)
                .resolve(240, "Toner cartridge seal had not been removed. Replaced the cartridge.")
                .verify(1400).close(1405, MEERA);
        report(daysAgo(24, 8, 50), ADITYA, "Password reset email never arrives",
                "Requested an SSO password reset three times; no email in inbox or spam.",
                "ACCESS", "SSO", Impact.MEDIUM, Urgency.HIGH)
                .acknowledge(4).start(10).note(15, "Reset mails are queued: the mail relay rejected the sender domain.")
                .resolve(28, "Fixed the relay allow-list for the SSO sender; queued reset mails were delivered.")
                .verify(120).close(125, ADITYA);
        report(daysAgo(22, 15, 20), FATIMA, "Lab 2 PC number 14 will not boot",
                "Black screen with 'No bootable device' on PC 14 in Lab 2.",
                "HARDWARE", "Lab Workstations", Impact.LOW, Urgency.LOW)
                .acknowledge(180).start(200).note(220, "SSD not detected in BIOS.")
                .resolve(1300, "Replaced the failed SSD and re-imaged the machine with the lab image.")
                .verify(2000).close(2005, LAKSHMI);
        report(daysAgo(21, 9, 40), ROHAN, "Phishing mail asking to verify salary account",
                "Received an email claiming to be from Accounts asking me to log in through a link to verify my salary account.",
                "SECURITY", "Email", Impact.MEDIUM, Urgency.HIGH)
                .acknowledge(8).start(12).note(30, "Same mail reached 140 staff mailboxes. Link points to a look-alike domain.")
                .resolve(100, "Blocked the sender and the domain, purged the mail from all mailboxes, sent an advisory.")
                .verify(400).close(405, ROHAN);
        report(daysAgo(19, 13, 10), ASHA, "Outlook keeps asking for password",
                "Outlook on my office PC prompts for my password every few minutes since this morning.",
                "APPLICATION", "Email", Impact.LOW, Urgency.MEDIUM)
                .acknowledge(25).start(40)
                .resolve(90, "Removed stale cached credentials from Windows Credential Manager and re-added the account.")
                .verify(300).close(305, ASHA);
        report(daysAgo(18, 10, 0), RAHUL, "Exam portal very slow during quiz",
                "Students report the exam portal takes 20+ seconds per page during the morning quiz.",
                "DATABASE", "Database Cluster", Impact.HIGH, Urgency.MEDIUM)
                .acknowledge(5).start(9).note(15, "One reporting query is doing a full table scan on answers.")
                .note(40, "Added a missing index on answers(attempt_id).")
                .resolve(70, "Added the missing index; page loads are back under one second.")
                .verify(500).close(505, RAVI);
        report(daysAgo(16, 16, 45), SNEHA, "Need access to the research shared drive",
                "I joined the Data Science lab and need read/write access to the lab's shared drive.",
                "ACCESS", "SSO", Impact.LOW, Urgency.LOW)
                .acknowledge(60).start(70)
                .resolve(200, "Added the user to the DS-Lab group after approval from the lab head.")
                .verify(1200).close(1205, SNEHA);
        report(daysAgo(14, 9, 5), KARTHIK, "LMS assignment upload fails for large files",
                "Uploading a 60 MB project report to the LMS fails with 'Request entity too large'.",
                "APPLICATION", "LMS", Impact.MEDIUM, Urgency.MEDIUM)
                .acknowledge(40).start(55).note(90, "Upload limit on the LMS proxy is 50 MB.")
                .resolve(240, "Raised the proxy upload limit to 200 MB to match the LMS setting.")
                .verify(900).close(905, KARTHIK);
        report(daysAgo(12, 11, 30), MEERA, "Wi-Fi dead zone in Mess 2",
                "No Wi-Fi signal at all in the north half of Mess 2 since the renovation.",
                "NETWORK", "Campus Wi-Fi", Impact.MEDIUM, Urgency.LOW)
                .acknowledge(50).start(70).note(100, "Access point AP-M2-03 was not re-mounted after the renovation.")
                .resolve(1500, "Re-installed and powered AP-M2-03; coverage confirmed with a site survey.")
                .verify(2200).close(2210, LAKSHMI);
        report(daysAgo(10, 14, 0), ADITYA, "Payroll slip shows wrong HRA amount",
                "The October payslip shows HRA at the old rate.",
                "APPLICATION", "Payroll", Impact.MEDIUM, Urgency.MEDIUM)
                .acknowledge(30).start(45)
                .resolve(400, "HRA rate table was not updated for October; corrected and regenerated the slip.")
                .verify(1000).close(1005, ADITYA);
        report(daysAgo(9, 8, 20), FATIMA, "Fee payment page times out",
                "Paying the hostel fee through the Payment App times out at the bank redirect.",
                "APPLICATION", "Payment App", Impact.HIGH, Urgency.HIGH)
                .acknowledge(3).start(6).note(12, "Payment gateway callback URL still points to the old server.")
                .resolve(25, "Updated the callback URL; test payment of Rs 1 succeeded.")
                .verify(200).close(210, FATIMA);
        report(daysAgo(8, 10, 10), ROHAN, "VPN connects but no internal sites open",
                "From home the VPN shows connected but ERP and LMS do not load.",
                "NETWORK", "VPN", Impact.MEDIUM, Urgency.MEDIUM)
                .acknowledge(35).start(50).note(80, "Split-tunnel profile is missing the new ERP subnet.")
                .resolve(300, "Added the ERP and LMS subnets to the VPN split-tunnel profile.")
                .verify(1100).close(1110, RAVI);
        report(daysAgo(7, 9, 0), ASHA, "Core switch reboot took down LAN in Admin block",
                "No wired network in the whole Admin block for about 20 minutes this morning.",
                "NETWORK", "Network", Impact.LOW, Urgency.MEDIUM)
                .acknowledge(6).start(10).note(20, "Switch rebooted after a firmware crash; logs saved for the vendor.")
                .resolve(100, "Upgraded the switch firmware to the vendor's fixed release; monitoring for a week.")
                .verify(400).close(410, ASHA);
        report(daysAgo(6, 15, 30), RAHUL, "Database backup job failed overnight",
                "Monitoring mail says the nightly backup of the ERP database failed.",
                "DATABASE", "Database Cluster", Impact.MEDIUM, Urgency.MEDIUM)
                .acknowledge(10).start(14)
                .resolve(110, "Backup disk was full; rotated old backups and re-ran the job successfully.")
                .verify(700).close(705, LAKSHMI);
        report(daysAgo(5, 11, 45), SNEHA, "Account locked after password change",
                "Changed my password yesterday and now my account is locked on every service.",
                "ACCESS", "SSO", Impact.LOW, Urgency.HIGH)
                .acknowledge(12).start(15)
                .resolve(40, "Old password was saved on a phone mail client; unlocked the account and updated the phone.")
                .verify(200).close(205, SNEHA);
        report(daysAgo(4, 10, 30), KARTHIK, "Lab 4 machines missing Python packages",
                "numpy and pandas are missing on the Lab 4 machines for tomorrow's lab session.",
                "APPLICATION", "Lab Workstations", Impact.MEDIUM, Urgency.LOW)
                .acknowledge(60).start(80)
                .resolve(300, "Added numpy and pandas to the lab image and pushed it to all Lab 4 machines.")
                .verify(1200).close(1210, KARTHIK);

        // --- Recent, still moving ---
        // VERIFIED, waiting to be closed.
        report(daysAgo(4, 15, 0), ADITYA, "Payroll slip shows wrong month",
                "The payslip downloaded today is titled September instead of October.",
                "APPLICATION", "Payroll", Impact.MEDIUM, Urgency.LOW)
                .acknowledge(40).start(60)
                .resolve(500, "The slip template used the previous month's label; fixed and regenerated.")
                .verify(1500);
        // Resolved, then reopened by the reporter: back IN_PROGRESS, resolution clock breached.
        report(daysAgo(3, 9, 10), MEERA, "Smart board in Room 204 not responding to touch",
                "The smart board displays fine but ignores all touch input.",
                "HARDWARE", "Classroom AV", Impact.MEDIUM, Urgency.MEDIUM)
                .acknowledge(30).start(45)
                .resolve(200, "Recalibrated the touch sensor.")
                .reopen(1500, "Touch works for a few minutes and then stops again.")
                .note(1560, "Suspect the USB touch cable; replacement ordered.");
        // IN_PROGRESS, resolution SLA breached.
        report(daysAgo(3, 11, 20), ASHA, "Fee receipt PDF download fails in ERP",
                "Clicking 'Download receipt' in the ERP fee section gives a blank page.",
                "APPLICATION", "ERP", Impact.LOW, Urgency.MEDIUM)
                .acknowledge(40).start(55).note(120, "Receipt service throws a font-not-found error when building the PDF.");
        // SECURITY incident with Priya, IN_PROGRESS and breached; she goes on leave below.
        report(daysAgo(2, 10, 0), ROHAN, "Phishing email impersonating the Dean's office",
                "Several faculty received an email from 'Dean Office' asking them to open a shared document link.",
                "SECURITY", "Email", Impact.HIGH, Urgency.MEDIUM)
                .acknowledge(10).start(15)
                .note(40, "Link leads to a credential-harvesting page; 3 users entered their passwords.")
                .note(90, "Forced password resets for the 3 affected users.");
        // RESOLVED, waiting for Asha to verify (good for the video).
        report(daysAgo(1, 9, 30), ASHA, "Outlook not syncing on mobile",
                "Email on my Android phone stopped syncing yesterday; the desktop is fine.",
                "APPLICATION", "Email", Impact.LOW, Urgency.MEDIUM)
                .acknowledge(30).start(40)
                .resolve(180, "The phone's mail app token had expired; removed and re-added the account with modern auth.");
        // RESOLVED; SSO has many dependents, so the priority was raised (P4 -> P3).
        report(daysAgo(1, 14, 0), FATIMA, "Password reset link expired immediately",
                "The SSO password reset link says 'expired' even when opened within a minute.",
                "ACCESS", "SSO", Impact.LOW, Urgency.LOW)
                .acknowledge(30).start(45)
                .resolve(240, "Clock drift on one SSO node made new links look expired; re-synced NTP.");
        // ASSIGNED, never acknowledged: response and resolution SLAs both breached.
        report(hoursAgo(30), KARTHIK, "Lab 3 PCs stuck on Windows update screen",
                "Six PCs in Lab 3 have shown 'Working on updates 0%' since yesterday afternoon.",
                "HARDWARE", "Lab Workstations", Impact.MEDIUM, Urgency.LOW);
        // IN_PROGRESS, P4, 20 of 24 hours used: resolution SLA at risk.
        report(hoursAgo(20), MEERA, "Library second floor printer jams on every job",
                "Every print job on the second floor printer jams at the fuser.",
                "HARDWARE", "Printing", Impact.LOW, Urgency.LOW)
                .acknowledge(60).start(90).note(120, "Fuser roller worn out; part requested from the vendor.");
        // Reassigned by an admin after the first technician started.
        report(hoursAgo(5), ADITYA, "VPN login rejected after password change",
                "Since changing my password the VPN client says 'authentication failed'.",
                "ACCESS", "VPN", Impact.LOW, Urgency.MEDIUM)
                .acknowledge(20).start(30).note(60, "VPN uses a separate RADIUS cache; needs the network team.")
                .reassign(120, RAVI, KIRAN, ARJUN).acknowledge(135);
        // P4, acknowledged, plenty of time left.
        report(hoursAgo(5), RAHUL, "Request new keyboard for staff room PC",
                "Several keys on the staff room PC keyboard are stuck.",
                "HARDWARE", "Lab Workstations", Impact.LOW, Urgency.LOW)
                .acknowledge(90);
        // Near-duplicate pair 1 (Wi-Fi in Ram Bhawan): first report, ACKNOWLEDGED.
        report(hoursAgo(4), SNEHA, "Wi-Fi keeps disconnecting in Ram Bhawan hostel",
                "Wi-Fi in Ram Bhawan drops every few minutes on all floors since last night.",
                "NETWORK", "Campus Wi-Fi", Impact.MEDIUM, Urgency.MEDIUM)
                .acknowledge(25);
        // Near-duplicate pair 2 (LMS session expired): first report, IN_PROGRESS.
        report(hoursAgo(3), KARTHIK, "LMS login shows session expired error",
                "After logging in to the LMS I immediately get 'Your session has expired'.",
                "APPLICATION", "LMS", Impact.MEDIUM, Urgency.MEDIUM)
                .acknowledge(15).start(25).note(60, "Happens only when going through SSO, not with a local login.");
        // Network has many dependent services: PRIORITY_RAISED P3 -> P2. IN_PROGRESS.
        report(minutesAgo(70), ASHA, "Core switch in Library block flapping",
                "Wired LAN on two floors of the Library block goes down for a minute every few minutes.",
                "NETWORK", "Network", Impact.LOW, Urgency.MEDIUM)
                .acknowledge(8).start(12).note(30, "Port-channel to the distribution switch is flapping; checking optics.");
        // Pair 2, second report: ACKNOWLEDGED.
        report(minutesAgo(70), FATIMA, "LMS says session expired right after login",
                "I log in to the LMS and it says the session expired; tried two browsers.",
                "APPLICATION", "LMS", Impact.MEDIUM, Urgency.MEDIUM)
                .acknowledge(20);
        // Pair 1, second report: ASSIGNED, 50 of 60 response minutes used, so at risk.
        report(minutesAgo(50), ROHAN, "WiFi dropping every few minutes in Ram Bhawan",
                "Ram Bhawan hostel Wi-Fi disconnects every few minutes, phones and laptops alike.",
                "NETWORK", "Campus Wi-Fi", Impact.MEDIUM, Urgency.MEDIUM);
        // DATABASE, ASSIGNED a few minutes ago (priority raised: Database Cluster has 3 dependents).
        report(minutesAgo(10), RAHUL, "Exam portal queries slow again",
                "Quiz pages are taking several seconds to load again this morning.",
                "DATABASE", "Database Cluster", Impact.LOW, Urgency.MEDIUM);

        // --- Priya (the only SECURITY technician) goes on leave: new SECURITY tickets stay CLASSIFIED ---
        Technician priya = technicianRepository.findById(PRIYA).orElseThrow();
        priya.setAvailable(false);
        technicianRepository.save(priya);

        // CLASSIFIED, P1 on SSO, nobody to assign: response SLA breached within minutes.
        // Reported by an administrator for Meera, as when an employee phones the help desk.
        reportFor(minutesAgo(12), LAKSHMI, MEERA, "Suspicious login alerts from overseas IP",
                "Got 5 'new sign-in' alerts from an overseas IP in the last 10 minutes; I did not log in.",
                "SECURITY", "SSO", Impact.MEDIUM, Urgency.HIGH);
        // CLASSIFIED, P3, 40 of 60 response minutes used.
        report(minutesAgo(40), FATIMA, "USB drive in Lab 2 triggers malware warning",
                "Antivirus flagged a USB drive left in Lab 2 PC 7 as containing a trojan.",
                "SECURITY", "Lab Workstations", Impact.LOW, Urgency.MEDIUM);

        // --- NEW: waiting for an administrator to triage (see newIncident) ---
        newIncident(minutesAgo(35), SNEHA, "New faculty member needs ERP access",
                "Dr. Rao joined the Physics department today and needs ERP access for attendance.",
                "ACCESS", "ERP", Impact.LOW, Urgency.MEDIUM);
        newIncident(minutesAgo(20), KARTHIK, "Install MATLAB on Lab 4 machines",
                "The control systems course needs MATLAB on all Lab 4 machines from next week.",
                "APPLICATION", "Lab Workstations", Impact.LOW, Urgency.LOW);
    }

    // ===== Story helpers =====

    private LocalDateTime daysAgo(int days, int hour, int minute) {
        return now.minusDays(days).withHour(hour).withMinute(minute).withSecond(0);
    }

    private LocalDateTime hoursAgo(int hours) {
        return now.minusHours(hours);
    }

    private LocalDateTime minutesAgo(int minutes) {
        return now.minusMinutes(minutes);
    }

    // Reports through IncidentService.report (classify, SLA start, assignment, events), then
    // moves created_at back to 'when'. The SLA deadlines move by the same amount, so each window
    // keeps the length its policy gives it.
    private Story report(LocalDateTime when, String reporterId, String title, String description,
                         String category, String serviceName, Impact impact, Urgency urgency) {
        return create(when, reporterId, reporterId, null, title, description, category, serviceName, impact, urgency);
    }

    // An administrator reporting for an employee (onBehalfOfEmployeeId), as the report form allows.
    private Story reportFor(LocalDateTime when, String adminId, String employeeId, String title, String description,
                            String category, String serviceName, Impact impact, Urgency urgency) {
        return create(when, adminId, employeeId, employeeId, title, description, category, serviceName, impact, urgency);
    }

    private Story create(LocalDateTime when, String actorId, String reporterId, String onBehalfOf, String title,
                         String description, String category, String serviceName, Impact impact, Urgency urgency) {
        CreateIncidentRequest request = new CreateIncidentRequest(title, description, category,
                service(serviceName).getId(), impact, urgency, onBehalfOf);
        IncidentResponse created = at(when, () -> incidentService.report(request, actorId));
        jdbc.update("UPDATE incident SET "
                        + "response_due_at = CAST(? AS timestamp) + (response_due_at - created_at), "
                        + "resolution_due_at = CAST(? AS timestamp) + (resolution_due_at - created_at), "
                        + "created_at = ? WHERE id = ?",
                when, when, when, created.id());
        return new Story(created.id(), when, reporterId, created.assignedTechnicianId());
    }

    // IncidentService.report always classifies, so an incident that is still NEW is built with the
    // domain constructor and saved directly, the same way DataSeeder creates its sample incident.
    // Its audit trail is just CREATED, exactly what a NEW incident has.
    private void newIncident(LocalDateTime when, String reporterId, String title, String description,
                             String category, String serviceName, Impact impact, Urgency urgency) {
        Employee reporter = (Employee) userRepository.findById(reporterId).orElseThrow();
        Category cat = categoryRepository.findById(category).orElseThrow();
        String id = String.format("INC-%04d", incidentRepository.count() + 1);
        at(when, () -> incidentRepository.save(
                new Incident(id, title, description, reporter, cat, service(serviceName), impact, urgency)));
        jdbc.update("UPDATE incident SET created_at = ? WHERE id = ?", when, id);
    }

    // Runs one step and moves every audit record, note and notification it created to 'when'.
    // Ids only grow, so "id greater than the highest id before the step" is exactly the new rows.
    private <T> T at(LocalDateTime when, Supplier<T> step) {
        if (when.isAfter(now)) {
            throw new IllegalStateException("Demo step at " + when + " is in the future");
        }
        long auditBefore = maxId("audit_record");
        long noteBefore = maxId("investigation_note");
        long notificationBefore = maxId("notification");
        T result = step.get();
        jdbc.update("UPDATE audit_record SET timestamp = ? WHERE id > ?", when, auditBefore);
        jdbc.update("UPDATE investigation_note SET created_at = ? WHERE id > ?", when, noteBefore);
        jdbc.update("UPDATE notification SET created_at = ? WHERE id > ?", when, notificationBefore);
        return result;
    }

    private long maxId(String table) {
        return jdbc.queryForObject("SELECT COALESCE(MAX(id), 0) FROM " + table, Long.class);
    }

    private ITService service(String name) {
        return itServiceRepository.findByName(name)
                .orElseThrow(() -> new IllegalStateException("Demo data needs the service " + name));
    }

    // One incident's script. Each method runs one real service call at 'minutes' after the report,
    // backdates what it created, and returns this so the steps read as a chain.
    private final class Story {
        private final String id;
        private final LocalDateTime createdAt;
        private final String reporterId;
        private String technicianId;

        // technicianId is null when no technician was free; the incident then stays CLASSIFIED.
        Story(String id, LocalDateTime createdAt, String reporterId, String technicianId) {
            this.id = id;
            this.createdAt = createdAt;
            this.reporterId = reporterId;
            this.technicianId = technicianId;
        }

        Story acknowledge(int minutes) {
            LocalDateTime when = time(minutes);
            at(when, () -> incidentService.acknowledge(id, requireTechnician()));
            jdbc.update("UPDATE incident SET acknowledged_at = ? WHERE id = ?", when, id);
            return this;
        }

        Story start(int minutes) {
            at(time(minutes), () -> incidentService.startWork(id, requireTechnician()));
            return this;
        }

        Story note(int minutes, String text) {
            at(time(minutes), () -> incidentService.addNote(id, new AddNoteRequest(text), requireTechnician()));
            return this;
        }

        Story resolve(int minutes, String details) {
            LocalDateTime when = time(minutes);
            at(when, () -> incidentService.resolve(id, new ResolveRequest(details), requireTechnician()));
            jdbc.update("UPDATE incident SET resolved_at = ? WHERE id = ?", when, id);
            return this;
        }

        Story verify(int minutes) {
            at(time(minutes), () -> incidentService.verify(id, reporterId));
            return this;
        }

        Story close(int minutes, String actorId) {
            LocalDateTime when = time(minutes);
            at(when, () -> incidentService.close(id, actorId));
            jdbc.update("UPDATE incident SET closed_at = ? WHERE id = ?", when, id);
            return this;
        }

        // The domain clears resolved_at itself, so nothing else needs fixing here.
        Story reopen(int minutes, String reason) {
            at(time(minutes), () -> incidentService.reopen(id, new ReopenRequest(reason), reporterId));
            return this;
        }

        // Moves the incident to the first candidate who is not already assigned.
        Story reassign(int minutes, String adminId, String... candidates) {
            String target = null;
            for (String candidate : candidates) {
                if (target == null && !candidate.equals(technicianId)) {
                    target = candidate;
                }
            }
            String newTechnician = target;
            at(time(minutes), () -> incidentService.reassign(id, new ReassignRequest(newTechnician), adminId));
            technicianId = newTechnician;
            return this;
        }

        private LocalDateTime time(int minutes) {
            return createdAt.plusMinutes(minutes);
        }

        private String requireTechnician() {
            if (technicianId == null) {
                throw new IllegalStateException("Demo story " + id + " has no assigned technician");
            }
            return technicianId;
        }
    }

    // ===== Final touches =====

    // Lets the real domain logic flag breaches and at-risk clocks, then moves those audit rows to
    // when they really happened: a breach at its due time, a risk at 75% of its window. The
    // notifications for them get the time of their audit row (matched by incident and action).
    private void recordSlaState() {
        long auditBefore = maxId("audit_record");
        long notificationBefore = maxId("notification");
        slaService.checkAll(now);
        jdbc.update("UPDATE audit_record a SET timestamp = i.response_due_at FROM incident i "
                + "WHERE a.incident_id = i.id AND a.id > ? AND a.action = 'SLA_RESPONSE_BREACHED'", auditBefore);
        jdbc.update("UPDATE audit_record a SET timestamp = i.resolution_due_at FROM incident i "
                + "WHERE a.incident_id = i.id AND a.id > ? AND a.action = 'SLA_RESOLUTION_BREACHED'", auditBefore);
        jdbc.update("UPDATE audit_record a SET timestamp = i.created_at + (i.response_due_at - i.created_at) * 0.75 "
                + "FROM incident i WHERE a.incident_id = i.id AND a.id > ? AND a.action = 'SLA_RESPONSE_AT_RISK'", auditBefore);
        jdbc.update("UPDATE audit_record a SET timestamp = i.created_at + (i.resolution_due_at - i.created_at) * 0.75 "
                + "FROM incident i WHERE a.incident_id = i.id AND a.id > ? AND a.action = 'SLA_RESOLUTION_AT_RISK'", auditBefore);
        // A notification message reads "INC-0001 (title): ACTION - description".
        jdbc.update("UPDATE notification n SET created_at = a.timestamp FROM audit_record a "
                + "WHERE n.id > ? AND a.id > ? AND a.incident_id = n.incident_id "
                + "AND n.message LIKE '%): ' || a.action || ' - %'", notificationBefore, auditBefore);
    }

    // Users would have read their older notifications, so only the last two days stay unread.
    private void markOldNotificationsRead() {
        jdbc.update("UPDATE notification SET is_read = true WHERE created_at < ?", now.minusDays(2));
    }
}
