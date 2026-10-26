package com.bank.banking.config;

import com.bank.banking.security.CustomUserDetailsService;
import com.bank.banking.security.JwtAuthFilter;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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

@EnableMethodSecurity
@Configuration
public class SecurityConfig {

    private final JwtAuthFilter jwt;
    private final CustomUserDetailsService users;

    public SecurityConfig(JwtAuthFilter jwt, CustomUserDetailsService users) {
        this.jwt = jwt;
        this.users = users;
    }

    @Bean
    SecurityFilterChain security(HttpSecurity http) throws Exception {

        return http
                .csrf(AbstractHttpConfigurer::disable)

                .sessionManagement(s -> s
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .exceptionHandling(e -> e
                        .authenticationEntryPoint((r, p, x) -> p.sendError(401))
                        .accessDeniedHandler((r, p, x) -> p.sendError(403)))

                // Disable form login — JWT is stateless
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)

                .authorizeHttpRequests(a -> a
                        .requestMatchers(
                                "/login",
                                "/register",
                                "/api/auth/**",
                                "/css/**",
                                "/js/**"
                        )
                        .permitAll()

                        .requestMatchers(
                                "/admin/**",
                                "/api/admin/**"
                        )
                        .hasRole("BANK")

                        .anyRequest()
                        .authenticated()
                )

                .authenticationProvider(provider())

                .addFilterBefore(
                        jwt,
                        UsernamePasswordAuthenticationFilter.class
                )

                .build();
    }

    @Bean
    DaoAuthenticationProvider provider() {
        DaoAuthenticationProvider p = new DaoAuthenticationProvider();
        p.setUserDetailsService(users);
        p.setPasswordEncoder(passwordEncoder());
        return p;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}