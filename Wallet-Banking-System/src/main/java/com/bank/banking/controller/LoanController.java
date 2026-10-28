package com.bank.banking.controller;

import com.bank.banking.model.entity.Loan;
import com.bank.banking.model.entity.LoanStatus;
import com.bank.banking.service.LoanService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/loans")
public class LoanController {

    private final LoanService service;

    public LoanController(LoanService service) {
        this.service = service;
    }

    public record ApplyRequest(
            @NotNull @DecimalMin("100.00") @DecimalMax("10000000.00") BigDecimal amount,
            @NotNull @DecimalMin("0.10") @DecimalMax("50.00") BigDecimal interestRate,
            @Min(1) @Max(360) int tenureMonths) {}

    // ==================================================================
    // APPLY (CUSTOMER)
    // ==================================================================
    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<Loan> apply(@Valid @RequestBody ApplyRequest req, Authentication auth) {
        UUID userId = UUID.fromString((String) auth.getPrincipal());
        return ResponseEntity.ok(service.apply(userId, req.amount(), req.interestRate(), req.tenureMonths()));
    }

    // ==================================================================
    // MY LOANS (CUSTOMER)
    // ==================================================================
    @GetMapping("/mine")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<Loan>> mine(Authentication auth) {
        return ResponseEntity.ok(service.forCustomer(UUID.fromString((String) auth.getPrincipal())));
    }

    // ==================================================================
    // ONE LOAN BY ID (owner, MANAGER, BANK)
    // ==================================================================
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> byId(@PathVariable Long id, Authentication auth) {
        UUID caller = UUID.fromString((String) auth.getPrincipal());
        boolean isStaff = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER")
                            || a.getAuthority().equals("ROLE_BANK"));
        return ResponseEntity.ok(service.getForCaller(id, caller, isStaff));
    }

    // ==================================================================
    // PENDING (MANAGER, BANK)
    // ==================================================================
    @GetMapping("/pending")
    @PreAuthorize("hasAnyRole('MANAGER','BANK')")
    public ResponseEntity<List<Loan>> pending() {
        return ResponseEntity.ok(service.pending());
    }

    // ==================================================================
    // FILTER BY STATUS (MANAGER, BANK)
    // ==================================================================
    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('MANAGER','BANK')")
    public ResponseEntity<?> byStatus(@PathVariable String status) {
        LoanStatus s;
        try {
            s = LoanStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid status: " + status));
        }
        return ResponseEntity.ok(service.byStatus(s));
    }

    // ==================================================================
    // PAGINATED (MANAGER, BANK)
    // ==================================================================
    @GetMapping("/admin/all")
    @PreAuthorize("hasAnyRole('MANAGER','BANK')")
    public ResponseEntity<Page<Loan>> all(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.allPaged(page, size));
    }

    // ==================================================================
    // APPROVE (MANAGER, BANK)
    // ==================================================================
    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('MANAGER','BANK')")
    public ResponseEntity<Loan> approve(@PathVariable Long id) {
        return ResponseEntity.ok(service.approve(id));
    }

    // ==================================================================
    // REJECT (MANAGER, BANK)
    // ==================================================================
    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('MANAGER','BANK')")
    public ResponseEntity<Loan> reject(@PathVariable Long id) {
        return ResponseEntity.ok(service.reject(id));
    }

    // ==================================================================
    // DISBURSE (MANAGER, BANK)
    // ==================================================================
    @PostMapping("/{id}/disburse")
    @PreAuthorize("hasAnyRole('MANAGER','BANK')")
    public ResponseEntity<Loan> disburse(@PathVariable Long id) {
        return ResponseEntity.ok(service.disburse(id));
    }

    // ==================================================================
    // CANCEL (CUSTOMER, before approval only)
    // ==================================================================
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<?> cancel(@PathVariable Long id, Authentication auth) {
        UUID caller = UUID.fromString((String) auth.getPrincipal());
        return ResponseEntity.ok(service.cancel(id, caller));
    }

    // ==================================================================
    // STATS (MANAGER, BANK)
    // ==================================================================
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('MANAGER','BANK')")
    public ResponseEntity<Map<String, Object>> stats() {
        return ResponseEntity.ok(service.stats());
    }

    // ==================================================================
    // EMI PREVIEW (public-ish, for calculator on the apply screen)
    // ==================================================================
    @GetMapping("/emi-preview")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> emiPreview(
            @RequestParam BigDecimal amount,
            @RequestParam BigDecimal interestRate,
            @RequestParam int tenureMonths) {
        return ResponseEntity.ok(service.emiPreview(amount, interestRate, tenureMonths));
    }
   

    // ==================================================================
    // schedule 
    // ==================================================================

    @GetMapping("/{id}/schedule")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> schedule(@PathVariable Long id, Authentication auth) {
        UUID caller = UUID.fromString((String) auth.getPrincipal());
        boolean isStaff = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER")
                            || a.getAuthority().equals("ROLE_BANK"));
        service.getForCaller(id, caller, isStaff);
        return ResponseEntity.ok(service.schedule(id));
    }


    // ==================================================================
    // EMI payment()
    // ==================================================================

    @PostMapping("/{id}/emi/{installmentNumber}/pay")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<Map<String, Object>> payEmi(
            @PathVariable Long id,
            @PathVariable int installmentNumber,
            Authentication auth) {
        UUID caller = UUID.fromString((String) auth.getPrincipal());
        return ResponseEntity.ok(service.payEmi(id, installmentNumber, caller));
    }
}