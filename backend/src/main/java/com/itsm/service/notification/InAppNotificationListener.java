package com.itsm.service.notification;

import com.itsm.domain.Notification;
import com.itsm.domain.User;
import com.itsm.domain.event.IncidentEvent;
import com.itsm.domain.event.IncidentEventListener;
import com.itsm.repository.NotificationRepository;
import com.itsm.repository.UserRepository;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class InAppNotificationListener implements IncidentEventListener {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public InAppNotificationListener(NotificationRepository notificationRepository,
                                     UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void onIncidentEvent(IncidentEvent event) {
        if (NotificationRules.shouldNotifyReporter(event)) {
            save(event.reporterId(), event);
        }
        if (NotificationRules.shouldNotifyTechnician(event)) {
            save(event.technicianId(), event);
        }
        if (NotificationRules.shouldNotifyAdmins(event)) {
            for (User admin : userRepository.findAdministrators()) {
                notificationRepository.save(new Notification(admin, event.incidentId(), NotificationRules.message(event)));
            }
        }
    }

    private void save(String userId, IncidentEvent event) {
        Optional<User> user = userRepository.findById(userId);
        if (user.isPresent()) {
            notificationRepository.save(
                    new Notification(user.get(), event.incidentId(), NotificationRules.message(event)));
        }
    }
}