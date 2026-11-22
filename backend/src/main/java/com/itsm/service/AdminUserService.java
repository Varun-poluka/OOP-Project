package com.itsm.service;

import com.itsm.domain.Administrator;
import com.itsm.domain.Category;
import com.itsm.domain.Employee;
import com.itsm.domain.Technician;
import com.itsm.domain.User;
import com.itsm.domain.exception.ResourceNotFoundException;
import com.itsm.dto.CreateUserRequest;
import com.itsm.dto.TechnicianResponse;
import com.itsm.dto.UpdateTechnicianRequest;
import com.itsm.dto.UserResponse;
import com.itsm.repository.CategoryRepository;
import com.itsm.repository.TechnicianRepository;
import com.itsm.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

// User administration: list, create any role, deactivate / reactivate, and edit technicians.
// Users are never deleted, so the incidents and audit records that point at them stay intact.
@Service
public class AdminUserService {

    private final UserRepository userRepository;
    private final TechnicianRepository technicianRepository;
    private final CategoryRepository categoryRepository;
    private final UserAccounts userAccounts;
    private final PasswordEncoder passwordEncoder;

    public AdminUserService(UserRepository userRepository, TechnicianRepository technicianRepository,
                            CategoryRepository categoryRepository, UserAccounts userAccounts,
                            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.technicianRepository = technicianRepository;
        this.categoryRepository = categoryRepository;
        this.userAccounts = userAccounts;
        this.passwordEncoder = passwordEncoder;
    }

    private User findUser(String id) {
        return userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    // Check, then change: every name must be a real category before anything is modified.
    private Set<Category> findCategories(List<String> names) {
        Set<Category> result = new HashSet<>();
        if (names == null) {
            return result;
        }
        for (String name : names) {
            String key = name.trim().toUpperCase();
            result.add(categoryRepository.findById(key)
                    .orElseThrow(() -> new ResourceNotFoundException("Category", key)));
        }
        return result;
    }

    // Grouped by role (the role names sort Admin, Employee, Technician), then by name.
    @Transactional(readOnly = true)
    public List<UserResponse> list() {
        List<UserResponse> result = new ArrayList<>();
        for (User user : userRepository.findAll()) {
            result.add(UserAccounts.toResponse(user));
        }
        result.sort(Comparator.comparing(UserResponse::role).thenComparing(UserResponse::name));
        return List.copyOf(result);
    }

    @Transactional
    public UserResponse create(CreateUserRequest request) {
        String email = userAccounts.requireFreeEmail(request.email());
        String hash = passwordEncoder.encode(request.password());
        User user;
        if (request.role().equals("TECHNICIAN")) {
            if (request.maxWorkload() == null) {
                throw new IllegalArgumentException("maxWorkload is required for a technician");
            }
            Set<Category> skills = findCategories(request.skills());
            Technician tech = new Technician(userAccounts.nextId(Technician.class), request.name(), email, hash,
                    request.maxWorkload());
            tech.replaceSkills(skills);
            user = tech;
        } else if (request.role().equals("ADMIN")) {
            user = new Administrator(userAccounts.nextId(Administrator.class), request.name(), email, hash);
        } else {
            user = new Employee(userAccounts.nextId(Employee.class), request.name(), email, hash);
        }
        return UserAccounts.toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse deactivate(String userId, String actorId) {
        User user = findUser(userId);
        if (user.getId().equals(actorId)) {
            throw new IllegalStateException("You cannot deactivate your own account");
        }
        // Their open incidents would be stuck with nobody able to work on them.
        if (user instanceof Technician tech && tech.getActiveIncidents() > 0) {
            throw new IllegalStateException(tech.getName() + " still has " + tech.getActiveIncidents()
                    + " active incidents. Reassign them first.");
        }
        user.deactivate();
        return UserAccounts.toResponse(user);
    }

    @Transactional
    public UserResponse reactivate(String userId) {
        User user = findUser(userId);
        user.reactivate();
        return UserAccounts.toResponse(user);
    }

    @Transactional
    public TechnicianResponse updateTechnician(String technicianId, UpdateTechnicianRequest request) {
        Technician tech = technicianRepository.findById(technicianId)
                .orElseThrow(() -> new ResourceNotFoundException("Technician", technicianId));
        Set<Category> skills = findCategories(request.skills());
        tech.changeMaxWorkload(request.maxWorkload()); // validates before the other fields change
        tech.replaceSkills(skills);
        tech.setAvailable(request.available());
        return TechnicianResponse.from(tech);
    }
}
