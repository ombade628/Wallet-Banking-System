package com.bank.banking.controller;

import com.bank.banking.model.dto.AccountResponse;
import com.bank.banking.model.dto.CreateAccountRequest;
import com.bank.banking.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountService service;

    public AccountController(AccountService service) {
        this.service = service;
    }

    // ==================================================================
    // 1. CREATE
    // ==================================================================
    @PostMapping
    public ResponseEntity<AccountResponse> create(@Valid @RequestBody CreateAccountRequest req,
                                                  Authentication auth) {
        return ResponseEntity.ok(service.create(currentUserId(auth), req));
    }

    // ==================================================================
    // 2. LIST OWN ACCOUNTS
    // ==================================================================
    @GetMapping
    public ResponseEntity<List<AccountResponse>> list(Authentication auth) {
        return ResponseEntity.ok(service.listOwned(currentUserId(auth)));
    }

    // ==================================================================
    // 3. GET ONE ACCOUNT
    // ==================================================================
    @GetMapping("/{id}")
    public ResponseEntity<AccountResponse> get(@PathVariable UUID id, Authentication auth) {
        return ResponseEntity.ok(service.get(id, currentUserId(auth)));
    }

    // ==================================================================
    // 4. LOOKUP BY ACCOUNT NUMBER
    // ==================================================================
    @GetMapping("/lookup/{number}")
    public ResponseEntity<?> lookup(@PathVariable("number") String number) {
        return service.lookup(number)
                .<ResponseEntity<?>>map(a -> ResponseEntity.ok(
                        Map.of("accountId", a.id(), "ownerName", a.ownerName())))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // ==================================================================
    // 5. TRANSACTION HISTORY FOR AN ACCOUNT
    // ==================================================================
    @GetMapping("/{id}/transactions")
    public ResponseEntity<?> transactions(@PathVariable UUID id, Authentication auth) {
        service.get(id, currentUserId(auth));
        return ResponseEntity.ok(service.history(id));
    }

    // ==================================================================
    // 6. ACTIVATE (owner or BANK)
    // ==================================================================
    @PostMapping("/{id}/activate")
    public ResponseEntity<AccountResponse> activate(@PathVariable UUID id, Authentication auth) {
        return ResponseEntity.ok(service.activate(id, currentUserId(auth)));
    }

    // ==================================================================
    // 7. FREEZE / UNFREEZE (owner self-service)
    // ==================================================================
    @PutMapping("/{id}/freeze")
    public ResponseEntity<AccountResponse> freezeOwn(@PathVariable UUID id, Authentication auth) {
        service.get(id, currentUserId(auth));
        service.freeze(id);
        return ResponseEntity.ok(service.get(id, currentUserId(auth)));
    }

    @PutMapping("/{id}/unfreeze")
    public ResponseEntity<AccountResponse> unfreezeOwn(@PathVariable UUID id, Authentication auth) {
        service.get(id, currentUserId(auth));
        service.unfreeze(id);
        return ResponseEntity.ok(service.get(id, currentUserId(auth)));
    }

    // ==================================================================
    // 8. CLOSE ACCOUNT (zero balance required)
    // ==================================================================
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> close(@PathVariable UUID id, Authentication auth) {
        service.close(id, currentUserId(auth));
        return ResponseEntity.noContent().build();
    }

    // ==================================================================
    // 9. BALANCE (single account, faster than full GET)
    // ==================================================================
    @GetMapping("/{id}/balance")
    public ResponseEntity<Map<String, Object>> balance(@PathVariable UUID id, Authentication auth) {
        AccountResponse a = service.get(id, currentUserId(auth));
        return ResponseEntity.ok(Map.of(
                "accountId", a.id(),
                "balance", a.balance(),
                "currency", a.currency(),
                "status", a.status()));
    }

    // ==================================================================
    // 10. TOTAL BALANCE ACROSS ALL ACCOUNTS
    // ==================================================================
    @GetMapping("/total")
    public ResponseEntity<Map<String, Object>> total(Authentication auth) {
        return ResponseEntity.ok(service.totalBalance(currentUserId(auth)));
    }

    // ==================================================================
    // 11. SUMMARY (counts by status/type)
    // ==================================================================
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> summary(Authentication auth) {
        return ResponseEntity.ok(service.summary(currentUserId(auth)));
    }

    // ==================================================================
    // 12. ADMIN / BANK: ALL ACCOUNTS IN THE BANK
    // ==================================================================
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('BANK')")
    public ResponseEntity<List<AccountResponse>> allAccounts() {
        return ResponseEntity.ok(service.listAll());
    }

    // ==================================================================
    // 13. ADMIN / BANK: ACTIVATE ANY ACCOUNT
    // ==================================================================
    @PostMapping("/admin/{id}/activate")
    @PreAuthorize("hasRole('BANK')")
    public ResponseEntity<AccountResponse> adminActivate(@PathVariable UUID id) {
        return ResponseEntity.ok(service.adminActivate(id));
    }

    // ==================================================================
    // 14. ADMIN / BANK: FREEZE ANY ACCOUNT
    // ==================================================================
    @PutMapping("/admin/{id}/freeze")
    @PreAuthorize("hasRole('BANK')")
    public ResponseEntity<AccountResponse> adminFreeze(@PathVariable UUID id) {
        service.freeze(id);
        return ResponseEntity.ok(service.adminGet(id));
    }

    // ==================================================================
    // 15. ADMIN / BANK: UNFREEZE ANY ACCOUNT
    // ==================================================================
    @PutMapping("/admin/{id}/unfreeze")
    @PreAuthorize("hasRole('BANK')")
    public ResponseEntity<AccountResponse> adminUnfreeze(@PathVariable UUID id) {
        service.unfreeze(id);
        return ResponseEntity.ok(service.adminGet(id));
    }

    // ==================================================================
    // 16. ADMIN / BANK: CLOSE ANY ACCOUNT (zero balance)
    // ==================================================================
    @DeleteMapping("/admin/{id}")
    @PreAuthorize("hasRole('BANK')")
    public ResponseEntity<Void> adminClose(@PathVariable UUID id) {
        service.adminClose(id);
        return ResponseEntity.noContent().build();
    }

    // ==================================================================
    // 17. ADMIN / BANK: ADJUST BALANCE (manual credit/debit with reason)
    // ==================================================================
    @PostMapping("/admin/{id}/adjust")
    @PreAuthorize("hasRole('BANK')")
    public ResponseEntity<AccountResponse> adminAdjust(
            @PathVariable UUID id,
            @RequestParam BigDecimal delta,
            @RequestParam(required = false, defaultValue = "manual") String reason) {
        return ResponseEntity.ok(service.adjustBalance(id, delta, reason));
    }

    // ==================================================================
    private UUID currentUserId(Authentication auth) {
        return UUID.fromString((String) auth.getPrincipal());
    }
    
    @GetMapping("/{id}/statement")
    public ResponseEntity<Map<String, Object>> statement(
            @PathVariable UUID id,
            @RequestParam int year,
            @RequestParam int month,
            Authentication auth) {
        return ResponseEntity.ok(service.statement(id, currentUserId(auth), year, month));
    }
    
}