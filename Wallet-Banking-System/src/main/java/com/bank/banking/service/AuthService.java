package com.bank.banking.service;

import com.bank.banking.model.dto.AuthResponse;
import com.bank.banking.model.dto.LoginRequest;
import com.bank.banking.model.dto.RegisterRequest;
import com.bank.banking.model.entity.Role;
import com.bank.banking.model.entity.User;
import com.bank.banking.model.entity.UserRole;
import com.bank.banking.repository.UserRepo;
import com.bank.banking.security.JwtService;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepo users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final AuthenticationManager authManager;

    public AuthService(UserRepo users, PasswordEncoder encoder,
                       JwtService jwt, AuthenticationManager authManager) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
        this.authManager = authManager;
    }

    @Transactional
    public String register(RegisterRequest req) {
        String email = req.email().toLowerCase();
        Role role = req.role() ; 

        if (users.existsByEmailAndRole(email, role)) {
            throw new IllegalArgumentException("Email already registered");
        }

        User u = new User(email, encoder.encode(req.password()), req.fullName());

        UserRole userRole = new UserRole();
        userRole.setUser(u);
        userRole.setRole(role);
        u.getRoles().add(userRole);

        users.save(u);
        return "Registration Successful";
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {

        String email = req.email().toLowerCase();

        // 1. Verify credentials (throws BadCredentialsException on failure)
        authManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, req.password())
        );

        // 2. Load user from DB
        User u = users.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        // 3. Enforce the requested role matches a role the user actually has
        boolean hasRole = u.getRoles().stream()
                .anyMatch(ur -> ur.getRole() == req.role());

        if (!hasRole) {
            throw new AccessDeniedException("Invalid role selected for this account");
        }

        // 4. Issue token using the SERVER-side role, not the request role
        String token = jwt.generate(u, req.role());

        return new AuthResponse(token);
    }
}