package com.bank.banking.service;

import com.bank.banking.model.entity.Role;
import com.bank.banking.model.entity.User;
import com.bank.banking.model.entity.UserRole;
import com.bank.banking.repository.UserRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepo users;

    public UserService(UserRepo users) {
        this.users = users;
    }

    @Transactional(readOnly = true)
    public User get(UUID id) {
        return users.findById(id).orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    @Transactional(readOnly = true)
    public User getByEmail(String email) {
        return users.findByEmail(email.toLowerCase()).orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    @Transactional(readOnly = true)
    public List<User> getAll() { return users.findAll(); }

    @Transactional(readOnly = true)
    public List<User> getByRole(Role role) { return users.findByRole(role); }

    @Transactional
    public void enable(UUID id) { get(id).setEnabled(true); }

    @Transactional
    public void disable(UUID id) { get(id).setEnabled(false); }

    @Transactional
    public void changeRole(UUID id, Role role) {
        User user = get(id);
        if (user.getRoles().stream().anyMatch(ur -> ur.getRole() == role)) {
            throw new IllegalArgumentException("User already has this role");
        }
        UserRole ur = new UserRole();
        ur.setUser(user);
        ur.setRole(role);
        user.getRoles().add(ur);
    }
    
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getUserProfile(UUID id) {
        User u = users.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        // Force initialization of the lazy roles collection while the session is still open
        java.util.List<String> roleNames = u.getRoles().stream()
                .map(ur -> ur.getRole().name())
                .toList();

        return java.util.Map.of(
                "id", u.getId(),
                "name", u.getFullName(),
                "email", u.getEmail(),
                "roles", roleNames
        );
    }
}