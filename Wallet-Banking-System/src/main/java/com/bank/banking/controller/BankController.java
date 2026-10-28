package com.bank.banking.controller;

import com.bank.banking.model.dto.AccountResponse;
import com.bank.banking.model.entity.Loan;
import com.bank.banking.model.entity.Role;
import com.bank.banking.model.entity.User;
import com.bank.banking.service.AccountService;
import com.bank.banking.service.LoanService;
import com.bank.banking.service.StaffService;
import com.bank.banking.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/bank")
@PreAuthorize("hasRole('BANK')")
public class BankController {

    private final UserService users;
    private final AccountService accounts;
    private final LoanService loans;
    private final StaffService staff;

    public BankController(UserService users,
                          AccountService accounts,
                          LoanService loans,
                          StaffService staff) {
        this.users = users;
        this.accounts = accounts;
        this.loans = loans;
        this.staff = staff;
    }

    // ==================================================================
    // STATS
    // ==================================================================
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats() {
        long totalUsers = users.getAll().size();
        long customers = users.getByRole(Role.CUSTOMER).size();
        long managers = users.getByRole(Role.MANAGER).size();
        long cashiers = users.getByRole(Role.CASHIER).size();
        long pendingLoans = loans.pending().size();

        return ResponseEntity.ok(Map.of(
                "totalUsers", totalUsers,
                "customers", customers,
                "managers", managers,
                "cashiers", cashiers,
                "pendingLoans", pendingLoans));
    }

    // ==================================================================
    // USERS
    // ==================================================================
    @GetMapping("/users")
    public ResponseEntity<?> users(@RequestParam(required = false) String role) {
        List<User> list;
        if (role == null || role.isBlank()) {
            list = users.getAll();
        } else {
            Role parsed;
            try {
                parsed = Role.valueOf(role.toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Invalid role: " + role));
            }
            list = users.getByRole(parsed);
        }

        return ResponseEntity.ok(list.stream().map(u -> Map.<String, Object>of(
                "id", u.getId(),
                "email", u.getEmail(),
                "fullName", u.getFullName(),
                "enabled", u.isEnabled(),
                "createdAt", u.getCreatedAt().toString())).toList());
    }

    @PutMapping("/users/{id}/enabled")
    public ResponseEntity<Void> setEnabled(@PathVariable UUID id,
                                           @RequestParam boolean enabled) {
        if (enabled) users.enable(id); else users.disable(id);
        return ResponseEntity.noContent().build();
    }

    // ==================================================================
    // STAFF (BANK can create MANAGER)
    // ==================================================================
    public record CreateManager(String email, String password, String fullName) {}

    @PostMapping("/staff/manager")
    public ResponseEntity<?> createManager(@RequestBody CreateManager req,
                                           Authentication auth) {
        if (req.email() == null || req.password() == null || req.fullName() == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "email, password, and fullName are required"));
        }
        if (req.password().length() < 8 || req.password().length() > 100) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Password must be 8-100 characters"));
        }

        User u = staff.createManager(req.email(), req.password(), req.fullName(), auth);
        return ResponseEntity.ok(Map.of(
                "id", u.getId(),
                "email", u.getEmail(),
                "fullName", u.getFullName()));
    }

    // ==================================================================
    // ACCOUNTS (bank-wide view + freeze/unfreeze)
    // ==================================================================
    @GetMapping("/accounts")
    public ResponseEntity<List<AccountResponse>> allAccounts() {
        return ResponseEntity.ok(users.getAll().stream()
                .flatMap(u -> accounts.listOwned(u.getId()).stream())
                .toList());
    }

    @PutMapping("/accounts/{id}/freeze")
    public ResponseEntity<Void> freeze(@PathVariable UUID id) {
        accounts.freeze(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/accounts/{id}/unfreeze")
    public ResponseEntity<Void> unfreeze(@PathVariable UUID id) {
        accounts.unfreeze(id);
        return ResponseEntity.noContent().build();
    }

    // ==================================================================
    // LOANS
    // ==================================================================
    @GetMapping("/loans")
    public ResponseEntity<?> loans(@RequestParam(required = false) String status) {
        if (status == null || status.isBlank()) {
            return ResponseEntity.ok(loans.pending());
        }

        switch (status.toUpperCase()) {
            case "PENDING":
                return ResponseEntity.ok(loans.pending());
            case "APPROVED":
                return ResponseEntity.ok(loans.byStatus(com.bank.banking.model.entity.LoanStatus.APPROVED));
            case "DISBURSED":
                return ResponseEntity.ok(loans.byStatus(com.bank.banking.model.entity.LoanStatus.DISBURSED));
            case "REJECTED":
                return ResponseEntity.ok(loans.byStatus(com.bank.banking.model.entity.LoanStatus.REJECTED));
            default:
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Unknown status: " + status));
        }
    }

    @PostMapping("/loans/{id}/approve")
    public ResponseEntity<Loan> approve(@PathVariable Long id) {
        return ResponseEntity.ok(loans.approve(id));
    }

    @PostMapping("/loans/{id}/reject")
    public ResponseEntity<Loan> reject(@PathVariable Long id) {
        return ResponseEntity.ok(loans.reject(id));
    }

    @PostMapping("/loans/{id}/disburse")
    public ResponseEntity<Loan> disburse(@PathVariable Long id) {
        return ResponseEntity.ok(loans.disburse(id));
    }

    // ==================================================================
    // NEW: MANUAL BALANCE ADJUSTMENT (BANK-only, auditable)
    // ==================================================================
    @PostMapping("/accounts/{id}/adjust")
    public ResponseEntity<AccountResponse> adjustBalance(
            @PathVariable UUID id,
            @RequestParam BigDecimal delta,
            @RequestParam(required = false, defaultValue = "manual") String reason) {
        return ResponseEntity.ok(accounts.adjustBalance(id, delta, reason));
    }

    // ==================================================================
    // NEW: SINGLE USER BY ID
    // ==================================================================
    @GetMapping("/users/{id}")
    public ResponseEntity<?> userById(@PathVariable UUID id) {
        User u = users.get(id);
        return ResponseEntity.ok(Map.of(
                "id", u.getId(),
                "email", u.getEmail(),
                "fullName", u.getFullName(),
                "enabled", u.isEnabled(),
                "roles", u.roleNames(),
                "createdAt", u.getCreatedAt().toString()));
    }

    // ==================================================================
    // NEW: ADD A ROLE TO AN EXISTING USER (promote/demote)
    // ==================================================================
    @PutMapping("/users/{id}/role")
    public ResponseEntity<?> addRole(@PathVariable UUID id, @RequestParam String role) {
        Role parsed;
        try {
            parsed = Role.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid role: " + role));
        }
        users.changeRole(id, parsed);
        return ResponseEntity.noContent().build();
    }
}