package com.bank.banking.service;

import com.bank.banking.model.entity.Role;
import com.bank.banking.model.entity.User;
import com.bank.banking.model.entity.UserRole;
import com.bank.banking.repository.AccountRepo;
import com.bank.banking.repository.LoanRepo;
import com.bank.banking.repository.UserRepo;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class StaffService {

    private final UserRepo users;
    private final PasswordEncoder encoder;
    private final AccountRepo accounts;    
    private final LoanRepo loans;        

    // ADDED — extend the constructor to inject the two new repos
    public StaffService(UserRepo users,
                        PasswordEncoder encoder,
                        AccountRepo accounts,
                        LoanRepo loans) {
        this.users = users;
        this.encoder = encoder;
        this.accounts = accounts;
        this.loans = loans;
    }

    @Transactional(readOnly = true)
    public User findById(UUID id) {
        return users.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + id));
    }


    @Transactional
    public User createManager(String email, String password, String fullName, Authentication authentication) {
        checkBank(authentication);
        if (users.existsByEmail(email.toLowerCase())) {
            throw new IllegalArgumentException("Email already registered");
        }
        User user = new User(email, encoder.encode(password), fullName);
        UserRole userRole = new UserRole();
        userRole.setUser(user);
        userRole.setRole(Role.MANAGER);
        user.getRoles().add(userRole);
        return users.save(user);
    }

    @Transactional
    public User createCashier(String email, String password, String fullName, Authentication authentication) {
        checkManager(authentication);
        if (users.existsByEmail(email.toLowerCase())) {
            throw new IllegalArgumentException("Email already registered");
        }
        User user = new User(email, encoder.encode(password), fullName);
        UserRole userRole = new UserRole();
        userRole.setUser(user);
        userRole.setRole(Role.CASHIER);
        user.getRoles().add(userRole);
        return users.save(user);
    }

    @Transactional
    public void changeRole(UUID id, Role role) {
        User u = users.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        boolean already = u.getRoles().stream()
                .anyMatch(ur -> ur.getRole() == role);
        if (already) {
            throw new IllegalArgumentException("User already has role " + role);
        }
        UserRole ur = new UserRole();
        ur.setUser(u);
        ur.setRole(role);
        u.getRoles().add(ur);
    }

    @Transactional
    public void setEnabled(UUID id, boolean enabled) {
        User u = users.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        u.setEnabled(enabled);
    }

    @Transactional(readOnly = true)
    public List<User> listByRole(Role role) {
        return users.findByRole(role);
    }

    @Transactional(readOnly = true)
    public List<User> listAll() {
        return users.findAllWithRoles(); 
    }

    @Transactional(readOnly = true)
    public List<User> listByEnabled(boolean enabled) {
        return users.findByEnabledWithRoles(enabled);  
    }
    

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<User> listPaged(int page, int size) {
        return users.findAll(org.springframework.data.domain.PageRequest.of(page, size,
                org.springframework.data.domain.Sort.by("createdAt").descending()));
    }

    @Transactional
    public User update(UUID id, String fullName, String email) {
        User u = findById(id);
        if (fullName != null && !fullName.isBlank()) {
            u.setFullName(fullName.trim());
        }
        if (email != null && !email.isBlank()) {
            String lowered = email.trim().toLowerCase();
            if (!lowered.equals(u.getEmail())) {
                if (users.existsByEmail(lowered)) {
                    throw new IllegalArgumentException("Email already registered");
                }
                u.setEmail(lowered);
            }
        }
        return u;
    }

    @Transactional
    public void resetPassword(UUID id, String newPassword) {
        User u = findById(id);
        u.setPasswordHash(encoder.encode(newPassword));
    }

    @Transactional
    public void delete(UUID id) {
        User u = findById(id);
        boolean isStaff = u.getRoles().stream()
                .anyMatch(ur -> ur.getRole() == Role.MANAGER || ur.getRole() == Role.CASHIER);
        if (!isStaff) {
            throw new SecurityException("Only MANAGER or CASHIER can be deleted via staff API");
        }
        if (!accounts.findByOwnerId(id).isEmpty()) {
            throw new IllegalStateException("Cannot delete user with open accounts");
        }
        if (!loans.findByCustomerIdOrderByAppliedDateDesc(id).isEmpty()) {
            throw new IllegalStateException("Cannot delete user with loan history");
        }
        users.delete(u);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> stats() {
        long managers = users.findByRole(Role.MANAGER).size();
        long cashiers = users.findByRole(Role.CASHIER).size();
        long enabled = users.findByEnabled(true).size();
        long disabled = users.findByEnabled(false).size();
        return Map.of(
                "managers", managers,
                "cashiers", cashiers,
                "enabled", enabled,
                "disabled", disabled,
                "total", managers + cashiers);
    }

    private void checkBank(Authentication authentication) {
        boolean isBank = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_BANK"));
        if (!isBank) {
            throw new SecurityException("Only Bank can create Manager");
        }
    }

    private void checkManager(Authentication authentication) {
        boolean allowed = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER")
                            || a.getAuthority().equals("ROLE_BANK"));
        if (!allowed) {
            throw new SecurityException("Only Manager or Bank can create Cashier");
        }
    }
}