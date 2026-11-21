package com.itsm.service;

import com.itsm.domain.Category;
import com.itsm.domain.Technician;
import com.itsm.dto.CategoryResponse;
import com.itsm.dto.TechnicianResponse;
import com.itsm.repository.CategoryRepository;
import com.itsm.repository.TechnicianRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

// Small read-only lists the frontend needs for its forms (category picker, assign dialog).
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
}
