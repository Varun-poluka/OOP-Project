package com.itsm.domain.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String resource, String id)
    {
        super(resource + " not found: " + id);
    }
}
