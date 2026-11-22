package com.itsm.dto;

// Never contains the password hash.
public record UserResponse(String id, String name, String email, String role, boolean active) { }
