package com.itsm.service;

import com.itsm.domain.Notification;
import com.itsm.domain.exception.ResourceNotFoundException;
import com.itsm.dto.NotificationResponse;
import com.itsm.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> forUser(String userId) {
        List<Notification> notifications = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId);

        List<NotificationResponse> result = new ArrayList<>();
        for (Notification notification : notifications) {
            result.add(NotificationResponse.from(notification));
        }
        return result;
    }

    @Transactional
    public NotificationResponse markAsRead(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", String.valueOf(id)));
        notification.markAsRead();
        return NotificationResponse.from(notification);
    }
}
