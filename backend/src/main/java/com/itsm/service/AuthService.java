package com.itsm.service;

import com.itsm.domain.Administrator;
import com.itsm.domain.Employee;
import com.itsm.domain.User;
import com.itsm.domain.exception.ResourceNotFoundException;
import com.itsm.dto.LoginRequest;
import com.itsm.dto.LoginResponse;
import com.itsm.dto.RegisterRequest;
import com.itsm.dto.UserResponse;
import com.itsm.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Service
public class AuthService {

    // Same message for unknown email and wrong password, so attackers cannot find valid emails.
    private static final String BAD_CREDENTIALS = "Invalid email or password";
    private static final String DEACTIVATED = "This account has been deactivated. Contact your administrator.";

    private final UserRepository userRepository;
    private final UserAccounts userAccounts;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final Duration tokenLifetime;
    // Checked when the email is unknown, so both failure cases take about the same time.
    private final String dummyHash;

    public AuthService(UserRepository userRepository,
                       UserAccounts userAccounts,
                       PasswordEncoder passwordEncoder,
                       JwtEncoder jwtEncoder,
                       @Value("${itsm.jwt.lifetime-hours}") long lifetimeHours) {
        this.userRepository = userRepository;
        this.userAccounts = userAccounts;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
        this.tokenLifetime = Duration.ofHours(lifetimeHours);
        this.dummyHash = passwordEncoder.encode("dummy-password-for-timing");
    }

    // The role name used in tokens and security rules. The domain calls admins "ADMINISTRATOR".
    public static String roleOf(User user) {
        if (user instanceof Administrator) {
            return "ADMIN";
        }
        return user.getRole();
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        Optional<User> found = userRepository.findByEmail(request.email().trim().toLowerCase());
        if (found.isEmpty()) {
            passwordEncoder.matches(request.password(), dummyHash);
            throw new BadCredentialsException(BAD_CREDENTIALS);
        }
        User user = found.get();
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException(BAD_CREDENTIALS);
        }
        // Checked after the password, so the message only tells the account's owner it is deactivated.
        if (!user.isActive()) {
            throw new DisabledException(DEACTIVATED);
        }

        Instant now = Instant.now();
        Instant expiresAt = now.plus(tokenLifetime);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("itsm")
                .subject(user.getId())
                .issuedAt(now)
                .expiresAt(expiresAt)
                .claim("name", user.getName())
                .claim("role", roleOf(user))
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new LoginResponse(token, expiresAt, toResponse(user));
    }

    // Always an employee. The caller then logs in as usual; registering returns no token.
    @Transactional
    public UserResponse register(RegisterRequest request) {
        String email = userAccounts.requireFreeEmail(request.email());
        Employee employee = new Employee(userAccounts.nextId(Employee.class), request.name(), email,
                passwordEncoder.encode(request.password()));
        return toResponse(userRepository.save(employee));
    }

    @Transactional(readOnly = true)
    public UserResponse me(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        return toResponse(user);
    }

    private UserResponse toResponse(User user) {
        return UserAccounts.toResponse(user);
    }
}
