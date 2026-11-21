package com.itsm.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.HandlerExceptionResolver;

import java.util.List;

@Configuration
public class SecurityConfig {

    // Hands security errors to GlobalExceptionHandler, so 401/403 use the same ProblemDetail JSON as other errors.
    private final HandlerExceptionResolver exceptionResolver;

    public SecurityConfig(@Qualifier("handlerExceptionResolver") HandlerExceptionResolver exceptionResolver) {
        this.exceptionResolver = exceptionResolver;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable()) // CSRF protects cookie sessions; a bearer-token API has none
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth
                        // Public
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
                        .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**", "/error").permitAll()
                        // Reporting
                        .requestMatchers(HttpMethod.POST, "/api/incidents").hasAnyRole("EMPLOYEE", "ADMIN")
                        // Administrator only
                        .requestMatchers(HttpMethod.PATCH, "/api/incidents/*/classify", "/api/incidents/*/assign",
                                "/api/incidents/*/reassign").hasRole("ADMIN")
                        .requestMatchers("/api/admin/**", "/api/reports/**").hasRole("ADMIN")
                        // Technician work (the service and domain also check it is the assigned technician)
                        .requestMatchers(HttpMethod.PATCH, "/api/incidents/*/acknowledge", "/api/incidents/*/start",
                                "/api/incidents/*/resolve").hasRole("TECHNICIAN")
                        .requestMatchers(HttpMethod.POST, "/api/incidents/*/notes").hasRole("TECHNICIAN")
                        // Reporter actions (the domain/service also check it is the reporter)
                        .requestMatchers(HttpMethod.PATCH, "/api/incidents/*/verify", "/api/incidents/*/reopen")
                                .hasRole("EMPLOYEE")
                        .requestMatchers(HttpMethod.PATCH, "/api/incidents/*/close").hasAnyRole("EMPLOYEE", "ADMIN")
                        // Everything else (reading incidents, notifications, /api/auth/me): any logged-in user
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth -> oauth
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
                        .authenticationEntryPoint(authenticationEntryPoint())
                        .accessDeniedHandler(accessDeniedHandler()))
                .exceptionHandling(e -> e
                        .authenticationEntryPoint(authenticationEntryPoint())
                        .accessDeniedHandler(accessDeniedHandler()));
        return http.build();
    }

    // Turns the token's "role" claim (e.g. ADMIN) into the authority ROLE_ADMIN that hasRole("ADMIN") checks.
    private JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName("role");
        authorities.setAuthorityPrefix("ROLE_");
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }

    // 401: no token, or the token is invalid or expired.
    private AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, ex) -> exceptionResolver.resolveException(request, response, null, ex);
    }

    // 403: valid token, but the role is not allowed here.
    private AccessDeniedHandler accessDeniedHandler() {
        return (request, response, ex) -> exceptionResolver.resolveException(request, response, null, ex);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // Lets the React dev server (another origin) call this API from the browser.
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:5173"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
