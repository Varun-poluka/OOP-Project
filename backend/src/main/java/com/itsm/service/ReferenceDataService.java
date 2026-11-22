package com.itsm.service;

import com.itsm.domain.Category;
import com.itsm.domain.Technician;
import com.itsm.domain.exception.DuplicateResourceException;
import com.itsm.domain.exception.ResourceNotFoundException;
import com.itsm.dto.CategoryResponse;
import com.itsm.dto.CreateCategoryRequest;
import com.itsm.dto.TechnicianResponse;
import com.itsm.repository.CategoryRepository;
import com.itsm.repository.TechnicianRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

// Small lists the frontend needs for its forms (category picker, assign dialog), and adding a category.
@Service
public class ReferenceDataService {

    private final CategoryRepository categoryRepository;
    private final TechnicianRepository technicianRepository;

    public ReferenceDataService(CategoryRepository categoryRepository, TechnicianRepository technicianRepository) {
        this.categoryRepository = categoryRepository;
        this.technicianRepository = technicianRepository;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> categories() {
        List<CategoryResponse> result = new ArrayList<>();
        for (Category category : categoryRepository.findAll(Sort.by("name"))) {
            result.add(CategoryResponse.from(category));
        }
        return result;
    }

    @Transactional(readOnly = true)
    public List<TechnicianResponse> technicians() {
        List<TechnicianResponse> result = new ArrayList<>();
        for (Technician technician : technicianRepository.findAll(Sort.by("name"))) {
            result.add(TechnicianResponse.from(technician));
        }
        return result;
    }

    // The new category is in the same table the report form reads, so it can be used at once.
    @Transactional
    public CategoryResponse createCategory(CreateCategoryRequest request) {
        String name = request.name().trim().toUpperCase();
        if (categoryRepository.existsById(name)) {
            throw new DuplicateResourceException("A category named " + name + " already exists");
        }
        String description = (request.description() == null || request.description().isBlank())
                ? null : request.description().trim();
        return CategoryResponse.from(categoryRepository.save(new Category(name, description)));
    }

    // The technician's own skills and workload, for the header of their queue.
    @Transactional(readOnly = true)
    public TechnicianResponse technician(String technicianId) {
        Technician technician = technicianRepository.findById(technicianId)
                .orElseThrow(() -> new ResourceNotFoundException("Technician", technicianId));
        return TechnicianResponse.from(technician);
    }
}
