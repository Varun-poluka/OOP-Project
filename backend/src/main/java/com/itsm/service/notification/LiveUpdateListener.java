package com.itsm.service.notification;

import com.itsm.domain.Incident;
import com.itsm.domain.User;
import com.itsm.domain.event.IncidentEvent;
import com.itsm.domain.event.IncidentEventListener;
import com.itsm.dto.IncidentUpdateEvent;
import com.itsm.dto.UnreadCountResponse;
import com.itsm.repository.IncidentRepository;
import com.itsm.repository.UserRepository;
import com.itsm.service.NotificationService;
import com.itsm.service.intelligence.SlaRiskAssessor;
import com.itsm.service.live.LiveUpdateRegistry;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.Set;

// Third Observer: pushes live updates to connected browsers.
// It runs inside the service's transaction, but only sends after that transaction commits,
// so a browser that refetches on the event always reads the new data.
@Component
public class LiveUpdateListener implements IncidentEventListener {

    private final LiveUpdateRegistry registry;
    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public LiveUpdateListener(LiveUpdateRegistry registry, IncidentRepository incidentRepository,
                              UserRepository userRepository, NotificationService notificationService) {
        this.registry = registry;
        this.incidentRepository = incidentRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @Override
    public void onIncidentEvent(IncidentEvent event) {
        // Who sees the incident change: reporter, assigned technician, every admin. A set avoids duplicates.
        Set<String> watchers = new LinkedHashSet<>();
        watchers.add(event.reporterId());
        if (event.technicianId() != null) {
            watchers.add(event.technicianId());
        }
        for (User admin : userRepository.findAdministrators()) {
            watchers.add(admin.getId());
        }
        watchers.removeIf(userId -> !registry.isConnected(userId));
        if (watchers.isEmpty()) {
            return; // nobody is listening, so skip the work
        }

        // The same rules InAppNotificationListener uses, so these are exactly the users who just got one.
        Set<String> notified = new LinkedHashSet<>();
        if (NotificationRules.shouldNotifyReporter(event)) {
            notified.add(event.reporterId());
        }
        if (NotificationRules.shouldNotifyTechnician(event)) {
            notified.add(event.technicianId());
        }
        if (NotificationRules.shouldNotifyAdmins(event)) {
            for (User admin : userRepository.findAdministrators()) {
                notified.add(admin.getId());
            }
        }
        notified.removeIf(userId -> !registry.isConnected(userId));

        // Built now, while the incident is loaded; findById returns the managed copy with the new state.
        IncidentUpdateEvent payload = payload(event);

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    push(watchers, notified, payload);
                }
            });
        } else {
            push(watchers, notified, payload); // no transaction: the data is already saved
        }
    }

    private IncidentUpdateEvent payload(IncidentEvent event) {
        Optional<Incident> incident = incidentRepository.findById(event.incidentId());
        if (incident.isEmpty()) {
            return new IncidentUpdateEvent(event.incidentId(), event.action(), event.newStatus(), null, null);
        }
        Incident current = incident.get();
        return new IncidentUpdateEvent(current.getId(), event.action(), current.getStatus(),
                current.getPriority(), SlaRiskAssessor.assess(current, LocalDateTime.now()).level());
    }

    private void push(Set<String> watchers, Set<String> notified, IncidentUpdateEvent payload) {
        for (String userId : watchers) {
            registry.send(userId, "incident", payload);
        }
        for (String userId : notified) {
            registry.send(userId, "notification", new UnreadCountResponse(notificationService.unreadCount(userId)));
        }
    }
}
