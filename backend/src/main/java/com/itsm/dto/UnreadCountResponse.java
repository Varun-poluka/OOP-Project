package com.itsm.dto;

// Body of GET /api/notifications/unread-count and data of the SSE "notification" event.
public record UnreadCountResponse(long unreadCount) { }
