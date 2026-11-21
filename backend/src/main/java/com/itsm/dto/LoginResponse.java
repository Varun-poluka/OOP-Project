package com.itsm.dto;

import java.time.Instant;

public record LoginResponse(String token, Instant expiresAt, UserResponse user) { }
