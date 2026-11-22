package com.itsm.domain.exception;

// Something with the same unique key (an email, a category name) already exists: HTTP 409.
public class DuplicateResourceException extends RuntimeException {
    public DuplicateResourceException(String message) {
        super(message);
    }
}
