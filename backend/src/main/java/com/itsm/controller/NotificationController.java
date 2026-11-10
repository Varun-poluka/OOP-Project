package com.itsm.controller;

import com.itsm.dto.NotificationResponse;
import com.itsm.service.NotificationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class NotificationController {
    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/api/users/{userId}/notifications")
    public List<NotificationResponse> forUser(@PathVariable String userId) {
        return notificationService.forUser(userId);
    }

    @PatchMapping("/api/notifications/{id}/read")
    public NotificationResponse markAsRead(@PathVariable Long id) {
        return notificationService.markAsRead(id);
    }
}
