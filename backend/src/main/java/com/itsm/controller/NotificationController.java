package com.itsm.controller;

import com.itsm.dto.NotificationResponse;
import com.itsm.dto.UnreadCountResponse;
import com.itsm.service.NotificationService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class NotificationController {
    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/api/users/{userId}/notifications")
    public List<NotificationResponse> forUser(@PathVariable String userId, @AuthenticationPrincipal Jwt jwt) {
        return notificationService.forUser(userId, jwt.getSubject());
    }

    @GetMapping("/api/notifications/unread-count")
    public UnreadCountResponse unreadCount(@AuthenticationPrincipal Jwt jwt) {
        return new UnreadCountResponse(notificationService.unreadCount(jwt.getSubject()));
    }

    @PatchMapping("/api/notifications/{id}/read")
    public NotificationResponse markAsRead(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return notificationService.markAsRead(id, jwt.getSubject());
    }
}
