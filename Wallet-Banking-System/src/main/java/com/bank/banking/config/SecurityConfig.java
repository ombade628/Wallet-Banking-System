package com.bank.banking.config;

import com.bank.banking.security.CustomUserDetailsService;
import com.bank.banking.security.JwtAuthFilter;
import com.bank.banking.security.LoginRateLimitFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;

@EnableMethodSecurity
@Configuration
public class SecurityConfig {

    private final JwtAuthFilter jwt;
    private final CustomUserDetailsService users;
    private final LoginRateLimitFilter rateLimit;

    public SecurityConfig(JwtAuthFilter jwt,
                          CustomUserDetailsService users,
                          LoginRateLimitFilter rateLimit) {
        this.jwt = jwt;
        this.users = users;
        this.rateLimit = rateLimit;
    }

    // ==================================================================
    // CORS
    // ==================================================================
    @Bean
    org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
        var cfg = new org.springframework.web.cors.CorsConfiguration();
        // Allow both common dev ports so you don't have to edit this file when switching
        cfg.setAllowedOrigins(java.util.List.of(
                "http://localhost:3000",     // React (CRA)
                "http://localhost:5173",     // React (Vite)
                "http://127.0.0.1:3000",
                "http://127.0.0.1:5173"
        ));
        cfg.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        cfg.setAllowedHeaders(java.util.List.of("*"));
        cfg.setExposedHeaders(java.util.List.of("Authorization", "Content-Disposition"));
        cfg.setAllowCredentials(true);
        cfg.setMaxAge(3600L);
        var src = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        src.registerCorsConfiguration("/**", cfg);
        return src;
    }

    // ==================================================================
    // FILTER CHAIN
    // ==================================================================
    @Bean
    SecurityFilterChain security(HttpSecurity http) throws Exception {
        return http
                // no server-side sessions, no CSRF (stateless API)
                .csrf(AbstractHttpConfigurer::disable)
                .cors(c -> c.configurationSource(corsConfigurationSource()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // security headers for browser clients
                .headers(h -> h
                        .contentTypeOptions(ct -> {})
                        .frameOptions(f -> f.deny())
                        .xssProtection(x -> {})
                        .referrerPolicy(r -> r.policy(
                                ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER))
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31536000)))

                // 401 JSON for APIs, redirect to /login for browser pages
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> {
                            String uri = req.getRequestURI();
                            if (uri.startsWith("/api/")) {
                                res.setStatus(401);
                                res.setContentType("application/json");
                                res.getWriter().write("{\"error\":\"UNAUTHORIZED\"}");
                            } else {
                                res.sendRedirect("/login");
                            }
                        })
                        .accessDeniedHandler((req, res, ex) -> {
                            res.setStatus(403);
                            res.setContentType("application/json");
                            res.getWriter().write("{\"error\":\"FORBIDDEN\"}");
                        }))

                // no forms, no basic
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)

                // ----- route rules -----
                .authorizeHttpRequests(a -> a
                        // public
                        .requestMatchers("/login", "/register", "/error").permitAll()
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/css/**", "/js/**", "/images/**", "/favicon.ico").permitAll()
                        .requestMatchers("/actuator/health").permitAll()

                        // most specific first
                        .requestMatchers("/api/accounts/admin/**").hasRole("BANK")
                        .requestMatchers("/api/manager/staff/**").hasAnyRole("MANAGER", "BANK")
                        .requestMatchers("/api/manager/**").hasRole("MANAGER")
                        .requestMatchers("/api/cashier/**").hasRole("CASHIER")
                        .requestMatchers("/api/customer/**").hasRole("CUSTOMER")
                        .requestMatchers("/api/bank/**", "/admin/**", "/api/admin/**").hasRole("BANK")

                        // common authenticated for everything else (accounts, transfers, loans)
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .anyRequest().authenticated())

                .authenticationProvider(provider())

                // JWT then rate-limit, before username filter
                .addFilterBefore(jwt, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(rateLimit, JwtAuthFilter.class)

                .build();
    }

    // ==================================================================
    // AUTH BEANS
    // ==================================================================
    @Bean
    DaoAuthenticationProvider provider() {
        DaoAuthenticationProvider p = new DaoAuthenticationProvider();
        p.setUserDetailsService(users);
        p.setPasswordEncoder(passwordEncoder());
        return p;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);  // cost 12 (default 10 — slower is safer)
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}