package com.itsm.dto;

import com.itsm.domain.Category;

public record CategoryResponse(String name, String description) {
    public static CategoryResponse from(Category category) {
        return new CategoryResponse(category.getName(), category.getDescription());
    }
}
