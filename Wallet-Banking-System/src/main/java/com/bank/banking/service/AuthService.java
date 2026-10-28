package com.bank.banking.service;

import com.bank.banking.model.dto.AuthResponse;
import com.bank.banking.model.dto.LoginRequest;
import com.bank.banking.model.dto.RegisterRequest;
import com.bank.banking.model.entity.Role;
import com.bank.banking.model.entity.User;
import com.bank.banking.model.entity.UserRole;
import com.bank.banking.repository.UserRepo;
import com.bank.banking.security.JwtService;

import java.util.UUID;

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
	private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AuthService.class);

	public AuthService(UserRepo users, PasswordEncoder encoder, JwtService jwt, AuthenticationManager authManager) {
		this.users = users;
		this.encoder = encoder;
		this.jwt = jwt;
		this.authManager = authManager;
	}

	@Transactional
	public String register(RegisterRequest req) {
		String email = req.email().toLowerCase();
		Role role = req.role();

		if (users.existsByEmail(email)) {
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
		authManager.authenticate(new UsernamePasswordAuthenticationToken(email, req.password()));

		// 2. Load user from DB
		User u = users.findByEmail(email).orElseThrow(() -> new UsernameNotFoundException("User not found"));

		// 3. Enforce the requested role matches a role the user actually has
		boolean hasRole = u.getRoles().stream().anyMatch(ur -> ur.getRole() == req.role());

		if (!hasRole) {
			throw new AccessDeniedException("Invalid role selected for this account");
		}

		// 4. Issue token using the SERVER-side role, not the request role
		String token = jwt.generate(u, req.role());

		return new AuthResponse(token);
	}

	// ==================================================================
	// REFRESH — issue a new JWT from a still-valid one
	// ==================================================================
	@Transactional(readOnly = true)
	public AuthResponse refresh(String token) {
		try {
			io.jsonwebtoken.Claims claims = jwt.parse(token);
			String userId = claims.getSubject();
			String email = claims.get("email", String.class);
			String role = claims.get("role", String.class);

			User u = users.findById(UUID.fromString(userId))
					.orElseThrow(() -> new UsernameNotFoundException("User not found"));

			String newToken = jwt.generate(u, Role.valueOf(role));
			return new AuthResponse(newToken);
		} catch (Exception e) {
			throw new org.springframework.security.access.AccessDeniedException("Invalid token");
		}
	}

	// ==================================================================
	// CHANGE PASSWORD
	// ==================================================================
 
	// ==================================================================
	// FORGOT PASSWORD — stub that logs; replace with email/SMS in prod
	// ==================================================================
	@Transactional
	public void startPasswordReset(String email) {
		User u = users.findByEmail(email.toLowerCase()).orElse(null);
		if (u == null)
			return; // don't leak existence
		String token = UUID.randomUUID().toString();
		// TODO: persist token + expiry, send by email
		log.info("Password reset token for {}: {}", email, token);
	}

	// ==================================================================
	// RESET PASSWORD — stub; in prod verify token against a store
	// ==================================================================
	@Transactional
	public void completePasswordReset(String token, String newPassword) {
		// TODO: lookup token, verify expiry, then:
		// u.setPasswordHash(encoder.encode(newPassword))
		throw new UnsupportedOperationException("Password reset not yet wired to a token store");
	}

	@Transactional
	public void changePassword(java.util.UUID userId, String currentPassword, String newPassword) {
		User u = users.findById(userId).orElseThrow(() -> new IllegalArgumentException("User not found"));

		if (!encoder.matches(currentPassword, u.getPasswordHash())) {
			throw new IllegalArgumentException("Current password is incorrect");
		}

		u.setPasswordHash(encoder.encode(newPassword));
	}
	
	
    @Transactional(readOnly = true)
    public AuthResponse switchRole(UUID userId, String requestedRole) {
        User u = users.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        Role roleToSet;
        try {
            roleToSet = Role.valueOf(requestedRole.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid role format");
        }

        // This line WILL CRASH without @Transactional(readOnly = true) on the method
        boolean hasRole = u.getRoles().stream().anyMatch(ur -> ur.getRole() == roleToSet);
        
        if (!hasRole) {
            throw new AccessDeniedException("You do not have permission to switch to this role");
        }

        String newToken = jwt.generate(u, roleToSet);
        return new AuthResponse(newToken);
    }

}