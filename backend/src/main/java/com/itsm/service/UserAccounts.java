package com.itsm.service;

import com.itsm.domain.Administrator;
import com.itsm.domain.Employee;
import com.itsm.domain.Technician;
import com.itsm.domain.User;
import com.itsm.domain.exception.DuplicateResourceException;
import com.itsm.dto.UserResponse;
import com.itsm.repository.UserRepository;
import org.springframework.stereotype.Component;

// Shared by self-registration (AuthService) and admin user creation (AdminUserService):
// the duplicate-email check and the next free id per role.
@Component
public class UserAccounts {

    private final UserRepository userRepository;

    public UserAccounts(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    // Emails are stored trimmed and lowercase (User.setEmail), so compare the same way.
    public String requireFreeEmail(String email) {
        String normalized = email.trim().toLowerCase();
        if (userRepository.findByEmail(normalized).isPresent()) {
            throw new DuplicateResourceException("An account with email " + normalized + " already exists");
        }
        return normalized;
    }

    // U-EMP-1, U-EMP-2, ...: the first number not yet taken (a count alone could hit an existing id).
    public String nextId(Class<? extends User> type) {
        String prefix;
        if (type == Employee.class) {
            prefix = "U-EMP-";
        } else if (type == Technician.class) {
            prefix = "U-TEC-";
        } else if (type == Administrator.class) {
            prefix = "U-ADM-";
        } else {
            throw new IllegalArgumentException("Unknown user type " + type.getSimpleName());
        }
        long number = userRepository.count() + 1;
        for (long candidate = 1; candidate <= number; candidate++) {
            if (!userRepository.existsById(prefix + candidate)) {
                return prefix + candidate;
            }
        }
        return prefix + (number + 1);
    }

    public static UserResponse toResponse(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), AuthService.roleOf(user), user.isActive());
    }
}
