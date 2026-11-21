package com.itsm.controller;

import com.itsm.service.live.LiveUpdateRegistry;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

// Server-Sent Events: the response stays open and the server writes events into it.
// The token comes in the normal Authorization header (the frontend uses a fetch-based SSE client).
@RestController
public class LiveUpdateController {
    private final LiveUpdateRegistry registry;

    public LiveUpdateController(LiveUpdateRegistry registry) {
        this.registry = registry;
    }

    @GetMapping(path = "/api/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@AuthenticationPrincipal Jwt jwt) {
        return registry.connect(jwt.getSubject());
    }
}
