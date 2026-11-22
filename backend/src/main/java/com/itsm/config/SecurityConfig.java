package com.itsm.config;

import jakarta.servlet.DispatcherType;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
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
    // Browser origins allowed to call the API (comma-separated in itsm.cors.allowed-origins).
    private final List<String> allowedOrigins;

    public SecurityConfig(@Qualifier("handlerExceptionResolver") HandlerExceptionResolver exceptionResolver,
                          @Value("${itsm.cors.allowed-origins}") List<String> allowedOrigins) {
        this.exceptionResolver = exceptionResolver;
        this.allowedOrigins = allowedOrigins;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable()) // CSRF protects cookie sessions; a bearer-token API has none
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth
                        // The SSE stream: when it ends, the container re-dispatches the request (ASYNC).
                        // The app is stateless, so that dispatch carries no login and would be denied.
                        // The original request was already checked, so the async dispatch is allowed.
                        .dispatcherTypeMatchers(DispatcherType.ASYNC).permitAll()
                        // Public
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/register").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
                        .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**", "/error").permitAll()
                        // Reporting
                        .requestMatchers(HttpMethod.POST, "/api/incidents", "/api/incidents/duplicates/check")
                                .hasAnyRole("EMPLOYEE", "ADMIN")
                        // Administrator only
                        .requestMatchers(HttpMethod.PATCH, "/api/incidents/*/classify", "/api/incidents/*/assign",
                                "/api/incidents/*/reassign").hasRole("ADMIN")
                        .requestMatchers("/api/admin/**", "/api/reports/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/incidents/*/recommendations", "/api/technicians")
                                .hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/services", "/api/services/*/dependencies/*").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/services/*/dependencies/*").hasRole("ADMIN")
                        // Technician only: the caller's own work queue and workload
                        .requestMatchers(HttpMethod.GET, "/api/incidents/queue", "/api/technicians/me").hasRole("TECHNICIAN")
                        // Technicians and admins (a technician only sees their own at-risk incidents)
                        .requestMatchers(HttpMethod.GET, "/api/incidents/at-risk", "/api/services/*/impact")
                                .hasAnyRole("TECHNICIAN", "ADMIN")
                        // Technician work (the service and domain also check it is the assigned technician)
                        .requestMatchers(HttpMethod.PATCH, "/api/incidents/*/acknowledge", "/api/incidents/*/start",
                                "/api/incidents/*/resolve").hasRole("TECHNICIAN")
                        .requestMatchers(HttpMethod.POST, "/api/incidents/*/notes", "/api/incidents/*/info-request")
                                .hasRole("TECHNICIAN")
                        // Reporter actions (the domain/service also check it is the reporter)
                        .requestMatchers(HttpMethod.PATCH, "/api/incidents/*/verify", "/api/incidents/*/reopen")
                                .hasRole("EMPLOYEE")
                        .requestMatchers(HttpMethod.POST, "/api/incidents/*/comments").hasRole("EMPLOYEE")
                        .requestMatchers(HttpMethod.PATCH, "/api/incidents/*/close").hasAnyRole("EMPLOYEE", "ADMIN")
                        // Everything else (reading incidents and their impact, the service list,
                        // notifications, categories, the live stream, /api/auth/me): any logged-in user
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
    // The default is http://localhost:5173; a second dev server can be added with
    // --itsm.cors.allowed-origins=http://localhost:5173,http://localhost:5174
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
