package com.bank.banking.controller;

import com.bank.banking.model.entity.LoanStatus;
import com.bank.banking.model.entity.Role;
import com.bank.banking.model.entity.User;
import com.bank.banking.service.AccountService;
import com.bank.banking.service.LoanService;
import com.bank.banking.service.StaffService;
import com.bank.banking.service.UserService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/manager")
@PreAuthorize("hasAnyRole('MANAGER','BANK')")
public class StaffController {

    private final StaffService staff;
    private final UserService users;
    private final LoanService loans;
    private final AccountService accounts;

    public StaffController(StaffService staff, UserService users, LoanService loans, AccountService accounts) {
        this.staff = staff;
        this.users = users;
        this.loans = loans;
        this.accounts = accounts;
    }

    public record CreateStaff(String email, String password, String fullName, String role) {
    }

    public record UpdateStaff(String fullName, String email) {
    }

    public record ResetPassword(String newPassword) {
    }

    // ==================================================================
    // DASHBOARD
    // ==================================================================
    

    // ==================================================================
    // STAFF
    // ==================================================================
    @GetMapping("/staff")
    public ResponseEntity<List<Map<String, Object>>> list() {
        return ResponseEntity.ok(staff.listAll().stream().map(this::toMap).toList());
    }

    @GetMapping("/staff/role/{role}")
    public ResponseEntity<?> listByRole(@PathVariable String role) {
        Role parsed;
        try {
            parsed = Role.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "invalid role: " + role));
        }
        return ResponseEntity.ok(staff.listByRole(parsed).stream().map(this::toMap).toList());
    }

    @GetMapping("/staff/enabled/{enabled}")
    public ResponseEntity<List<Map<String, Object>>> listByEnabled(@PathVariable boolean enabled) {
        return ResponseEntity.ok(staff.listByEnabled(enabled).stream().map(this::toMap).toList());
    }

    @GetMapping("/staff/paged")
    public ResponseEntity<Page<Map<String, Object>>> paged(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(staff.listPaged(page, size).map(this::toMap));
    }

    @GetMapping("/staff/{id}")
    public ResponseEntity<?> get(@PathVariable UUID id) {
        return ResponseEntity.ok(toMap(staff.findById(id)));
    }

    @PostMapping("/staff")
    public ResponseEntity<?> create(@RequestBody CreateStaff req, Authentication auth) {
        if (req.email() == null || req.password() == null || req.fullName() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "email, password, and fullName are required"));
        }
        if (req.password().length() < 8 || req.password().length() > 100) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be 8-100 characters"));
        }

        String requestedRole = req.role() == null ? "CASHIER" : req.role().toUpperCase();
        if (!requestedRole.equals("MANAGER") && !requestedRole.equals("CASHIER")) {
            return ResponseEntity.badRequest().body(Map.of("error", "role must be MANAGER or CASHIER"));
        }

        User u = "MANAGER".equals(requestedRole)
                ? staff.createManager(req.email(), req.password(), req.fullName(), auth)
                : staff.createCashier(req.email(), req.password(), req.fullName(), auth);

        return ResponseEntity.ok(Map.of(
                "id",       u.getId(),
                "email",    u.getEmail(),
                "fullName", u.getFullName(),
                "role",     requestedRole
        ));
    }

    @PutMapping("/staff/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody UpdateStaff req) {
        if (req.fullName() == null && req.email() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "at least one of fullName or email is required"));
        }
        return ResponseEntity.ok(toMap(staff.update(id, req.fullName(), req.email())));
    }

    @PutMapping("/staff/{id}/role")
    public ResponseEntity<?> changeRole(@PathVariable UUID id, @RequestParam String role) {
        Role newRole;
        try {
            newRole = Role.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "invalid role"));
        }
        staff.changeRole(id, newRole);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/staff/{id}/enabled")
    public ResponseEntity<?> setEnabled(@PathVariable UUID id, @RequestParam boolean enabled) {
        staff.setEnabled(id, enabled);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/staff/{id}/password")
    public ResponseEntity<?> resetPassword(@PathVariable UUID id, @RequestBody ResetPassword req) {
        if (req.newPassword() == null || req.newPassword().length() < 8 || req.newPassword().length() > 100) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be 8-100 characters"));
        }
        staff.resetPassword(id, req.newPassword());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/staff/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id) {
        staff.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/staff/stats")
    public ResponseEntity<Map<String, Object>> stats() {
        return ResponseEntity.ok(staff.stats());
    }

    // ==================================================================
    // HELPERS
    // ==================================================================
    private Map<String, Object> toMap(User u) {
        return Map.of(
                "id",        u.getId(),
                "email",     u.getEmail(),
                "fullName",  u.getFullName(),
                "enabled",   u.isEnabled(),
                "roles",     u.roleNames(),
                "createdAt", u.getCreatedAt() == null ? "" : u.getCreatedAt().toString()
        );
    }
}