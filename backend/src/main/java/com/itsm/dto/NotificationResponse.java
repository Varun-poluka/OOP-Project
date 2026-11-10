package com.itsm.dto;

import com.itsm.domain.Notification;

import java.time.LocalDateTime;

public record NotificationResponse(
        Long id,
        String incidentId,
        String message,
        boolean read,
        LocalDateTime createdAt
) {
    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getIncidentId(),
                notification.getMessage(),
                notification.isRead(),
                notification.getCreatedAt());
    }
}
