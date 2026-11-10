package com.itsm.service.notification;

import com.itsm.domain.event.IncidentEvent;
import com.itsm.domain.event.IncidentEventListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class EmailNotificationListener implements IncidentEventListener {

    private static final Logger log = LoggerFactory.getLogger(EmailNotificationListener.class);

    @Override
    public void onIncidentEvent(IncidentEvent event) {
        if (NotificationRules.shouldNotifyReporter(event)) {
            sendEmail(event.reporterEmail(), event);
        }
        if (NotificationRules.shouldNotifyTechnician(event)) {
            sendEmail(event.technicianEmail(), event);
        }
    }

    private void sendEmail(String to, IncidentEvent event) {
        log.info("[EMAIL] To: {} | Subject: Incident {} {} | Body: {}",
                to, event.incidentId(), event.action(), NotificationRules.message(event));
    }
}