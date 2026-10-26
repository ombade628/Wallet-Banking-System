package com.bank.banking.service;

import com.bank.banking.model.entity.Role;
import com.bank.banking.model.entity.User;
import com.bank.banking.repository.UserRepo;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.bank.banking.model.entity.UserRole;

@Service
public class StaffService {

    private final UserRepo users;
    private final PasswordEncoder encoder;

    public StaffService(UserRepo users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @Transactional
    public User createManager(
            String email,
            String password,
            String fullName,
            Authentication authentication) {

        checkBank(authentication);

        if (users.existsByEmail(email.toLowerCase())) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = new User(
                email,
                encoder.encode(password),
                fullName
        );

		UserRole userRole = new UserRole();
		userRole.setUser(user);
		userRole.setRole(Role.MANAGER);

		user.getRoles().add(userRole);

        return users.save(user);
    }

    @Transactional
    public User createCashier(
            String email,
            String password,
            String fullName,
            Authentication authentication) {

        checkManager(authentication);

        if (users.existsByEmail(email.toLowerCase())) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = new User(
                email,
                encoder.encode(password),
                fullName
        );

        UserRole userRole = new UserRole();
        userRole.setUser(user);
        userRole.setRole(Role.CASHIER);

        user.getRoles().add(userRole);

        return users.save(user);
    }

    private void checkBank(Authentication authentication) {
        boolean isBank = authentication.getAuthorities()
                .stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_BANK"));

        if (!isBank) {
            throw new SecurityException("Only Bank can create Manager");
        }
    }

    private void checkManager(Authentication authentication) {
        boolean isManager = authentication.getAuthorities()
                .stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));

        if (!isManager) {
            throw new SecurityException("Only Manager can create Cashier");
        }
    }
}