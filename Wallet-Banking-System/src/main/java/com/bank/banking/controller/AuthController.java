package com.bank.banking.controller;

import com.bank.banking.model.dto.AuthResponse;
import com.bank.banking.model.dto.ChangePasswordRequest;
import com.bank.banking.model.dto.LoginRequest;
import com.bank.banking.model.dto.RefreshTokenRequest;
import com.bank.banking.model.dto.RegisterRequest;
import com.bank.banking.model.dto.ResetPasswordRequest;
import com.bank.banking.model.dto.ForgotPasswordRequest;
import com.bank.banking.model.entity.Role;
import com.bank.banking.model.entity.User;
import com.bank.banking.service.AuthService;
import com.bank.banking.service.UserService;
import com.bank.banking.security.CookieUtil;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthService auth;
    private final CookieUtil cookies;
    private final UserService users; // ADDED: Needed for /me endpoint

    public AuthController(AuthService auth, CookieUtil cookies, UserService users) {
        this.auth = auth;
        this.cookies = cookies;
        this.users = users;
    }

    // ==================================================================
    // 1. REGISTER — always creates a CUSTOMER, ignores req.role()
    // ==================================================================
    @PostMapping("/register")
    public ResponseEntity<String> register(@Valid @RequestBody RegisterRequest req) {
        RegisterRequest safe = new RegisterRequest(
                req.email(), req.password(), req.fullName(), Role.CUSTOMER);
        return ResponseEntity.ok(auth.register(safe));
    }

    // ==================================================================
    // 2. LOGIN — returns JWT token
    // ==================================================================
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        AuthResponse response = auth.login(req);
        return ResponseEntity.ok().body(response);
    }

    // ==================================================================
    // 3. LOGOUT — clears the cookie (even if not used, safe to keep)
    // ==================================================================
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.noContent().build();
    }

    // ==================================================================
    // 4. CURRENT PROFILE — returns user details + ALL owned roles
    // ==================================================================
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "UNAUTHORIZED"));
        }
        
        UUID userId = UUID.fromString(auth.getPrincipal().toString());
        
        // Fetch user data + roles INSIDE a transaction (safe)
        Map<String, Object> profile = users.getUserProfile(userId);

        // Combine with the active role from the current JWT
        Map<String, Object> response = new java.util.HashMap<>(profile);
        response.put("activeRole", auth.getAuthorities().iterator().next().getAuthority().replace("ROLE_", ""));

        return ResponseEntity.ok(response);
    }

    // ==================================================================
    // 5. VERIFY SESSION — cheap call to check if the JWT is still valid
    // ==================================================================
    @GetMapping("/verify")
    public ResponseEntity<Map<String, Object>> verify(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("valid", false));
        }
        return ResponseEntity.ok(Map.of(
                "valid", true,
                "userId", auth.getPrincipal().toString()));
    }

    // ==================================================================
    // 6. CHECK ROLE — front-end calls this to gate UI
    // ==================================================================
    @GetMapping("/check-role/{role}")
    public ResponseEntity<Map<String, Object>> checkRole(@PathVariable String role,
                                                         Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            return ResponseEntity.ok(Map.of("hasRole", false));
        }
        boolean hasRole = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equalsIgnoreCase("ROLE_" + role.toUpperCase()));
        return ResponseEntity.ok(Map.of("hasRole", hasRole));
    }

    // ==================================================================
    // 7. REFRESH — issue a new JWT if the old one is still valid
    // ==================================================================
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest req) {
        AuthResponse refreshed = auth.refresh(req.token());
        return ResponseEntity.ok().body(refreshed);
    }

    // ==================================================================
    // 8. CHANGE PASSWORD — requires current password
    // ==================================================================
    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest req,
                                               Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        auth.changePassword(userId, req.currentPassword(), req.newPassword());
        return ResponseEntity.noContent().build();
    }

    // ==================================================================
    // 9. FORGOT PASSWORD — always returns 204 (don't leak user existence)
    // ==================================================================
    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        try {
            auth.startPasswordReset(req.email());
        } catch (Exception e) {
            log.info("Password reset requested for unknown email, ignored");
        }
        return ResponseEntity.noContent().build();
    }

    // ==================================================================
    // 10. RESET PASSWORD — via token from email/SMS
    // ==================================================================
    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        auth.completePasswordReset(req.token(), req.newPassword());
        return ResponseEntity.noContent().build();
    }
    
    // ==================================================================
    // 11. SWITCH ROLE — issue a new JWT for a different role the user owns
    // ==================================================================
    @PostMapping("/switch-role")
    public ResponseEntity<AuthResponse> switchRole(@RequestParam String role, 
                                                   Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        AuthResponse response = auth.switchRole(userId, role);
        return ResponseEntity.ok().body(response);
    }
}