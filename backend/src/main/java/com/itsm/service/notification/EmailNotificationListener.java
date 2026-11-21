package com.itsm.service.notification;

import com.itsm.domain.User;
import com.itsm.domain.event.IncidentEvent;
import com.itsm.domain.event.IncidentEventListener;
import com.itsm.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class EmailNotificationListener implements IncidentEventListener {

    private static final Logger log = LoggerFactory.getLogger(EmailNotificationListener.class);

    private final UserRepository userRepository;

    public EmailNotificationListener(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void onIncidentEvent(IncidentEvent event) {
        if (NotificationRules.shouldNotifyReporter(event)) {
            sendEmail(event.reporterEmail(), event, false);
        }
        if (NotificationRules.shouldNotifyTechnician(event)) {
            sendEmail(event.technicianEmail(), event, true);
        }
        if (NotificationRules.shouldNotifyAdmins(event)) {
            for (User admin : userRepository.findAdministrators()) {
                sendEmail(admin.getEmail(), event, false);
            }
        }
    }

    private void sendEmail(String to, IncidentEvent event, boolean toAssignedTechnician) {
        log.info("[EMAIL] To: {} | Subject: Incident {} {} | Body: {}",
                to, event.incidentId(), event.action(), NotificationMessageFormatter.format(event, toAssignedTechnician));
    }
}