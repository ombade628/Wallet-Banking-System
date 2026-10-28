package com.bank.banking.controller;

import com.bank.banking.model.dto.TransactionView;
import com.bank.banking.service.TransactionService;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactions;

    public TransactionController(TransactionService transactions) {
        this.transactions = transactions;
    }

    // ==================================================================
    // 1. GET ONE BY ID
    //     - owner sees it if it involves their account
    //     - BANK sees anything
    // ==================================================================
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> byId(@PathVariable UUID id, Authentication auth) {
        UUID caller = currentUserId(auth);
        boolean isBank = hasRole(auth, "ROLE_BANK");
        return ResponseEntity.ok(transactions.getForCaller(id, caller, isBank));
    }

    // ==================================================================
    // 2. GET BY REQUEST ID (idempotency key)
    // ==================================================================
    @GetMapping("/by-request-id/{requestId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> byRequestId(@PathVariable String requestId, Authentication auth) {
        UUID caller = currentUserId(auth);
        boolean isBank = hasRole(auth, "ROLE_BANK");
        return ResponseEntity.ok(transactions.getByRequestIdForCaller(requestId, caller, isBank));
    }

    // ==================================================================
    // 3. SEARCH (caller-scoped)
    //     ?direction=SENT|RECEIVED
    //     ?from=ISO8601  ?to=ISO8601
    //     ?minAmount=..  ?maxAmount=..
    //     ?q=text        (matches requestId or account number)
    // ==================================================================
    @GetMapping("/search")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<TransactionView>> search(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String direction,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount,
            @RequestParam(required = false) String q,
            Authentication auth) {
        return ResponseEntity.ok(transactions.searchForCaller(
                currentUserId(auth), page, size, direction, from, to, minAmount, maxAmount, q));
    }

    // ==================================================================
    // 4. COUNTS + TOTALS (current user's own stats)
    // ==================================================================
    @GetMapping("/stats")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> stats(Authentication auth) {
        return ResponseEntity.ok(transactions.statsForCaller(currentUserId(auth)));
    }

    // ==================================================================
    // 5. RECENT COUNTERPARTIES (for autocomplete)
    // ==================================================================
    @GetMapping("/counterparties")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<Map<String, Object>>> counterparties(Authentication auth) {
        return ResponseEntity.ok(transactions.recentCounterpartiesForCaller(currentUserId(auth)));
    }

    // ==================================================================
    // 6. RECENT N TRANSACTIONS FOR THE CALLER
    // ==================================================================
    @GetMapping("/recent")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TransactionView>> recent(
            @RequestParam(defaultValue = "10") int limit,
            Authentication auth) {
        return ResponseEntity.ok(transactions.recentForCaller(currentUserId(auth), limit));
    }

    // ==================================================================
    // 7. PER-ACCOUNT HISTORY (ownership enforced)
    // ==================================================================
    @GetMapping("/by-account/{accountId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> byAccount(
            @PathVariable UUID accountId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        boolean isBank = hasRole(auth, "ROLE_BANK");
        return ResponseEntity.ok(transactions.byAccountForCaller(
                accountId, currentUserId(auth), isBank, page, size));
    }

    // ==================================================================
    // 8. BANK-ONLY: ALL TRANSACTIONS
    // ==================================================================
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('BANK')")
    public ResponseEntity<Page<TransactionView>> all(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(transactions.allPaged(page, size));
    }
    

    // ==================================================================
    // 9. BANK-ONLY: FULL SEARCH (no ownership filter)
    // ==================================================================
    @GetMapping("/admin/search")
    @PreAuthorize("hasRole('BANK')")
    public ResponseEntity<Page<TransactionView>> adminSearch(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String direction,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount,
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(transactions.adminSearch(
                page, size, direction, from, to, minAmount, maxAmount, q));
    }
    

    // ==================================================================
    // 10. BANK-ONLY: DAILY TOTALS ACROSS THE WHOLE BANK
    // ==================================================================
    @GetMapping("/admin/daily")
    @PreAuthorize("hasRole('BANK')")
    public ResponseEntity<Map<String, Object>> dailyTotals() {
        return ResponseEntity.ok(transactions.dailyTotals());
    }
    

    // ==================================================================
    // 11. BANK-ONLY: TOTAL VOLUME IN A TIME WINDOW
    // ==================================================================
    @GetMapping("/admin/volume")
    @PreAuthorize("hasRole('BANK')")
    public ResponseEntity<Map<String, Object>> volume(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        return ResponseEntity.ok(transactions.volumeBetween(from, to));
    }
    

    // ==================================================================
    // HELPERS
    // ==================================================================
    private UUID currentUserId(Authentication auth) {
        return UUID.fromString((String) auth.getPrincipal());
    }
    
    // ==================================================================
    // HasRole
    // ==================================================================
    private boolean hasRole(Authentication auth, String role) {
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(role));
    }
}