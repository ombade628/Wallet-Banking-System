package com.bank.banking.controller;

import com.bank.banking.model.dto.TransactionView;
import com.bank.banking.model.dto.TransferRequest;
import com.bank.banking.model.dto.TransferResponse;
import com.bank.banking.service.TransferService;
import jakarta.validation.Valid;
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
@RequestMapping("/api/transfers")
public class TransferController {

    private final TransferService service;

    public TransferController(TransferService service) {
        this.service = service;
    }

    // ==================================================================
    // 1. EXECUTE A TRANSFER
    // ==================================================================
    @PostMapping
    public ResponseEntity<TransferResponse> transfer(@Valid @RequestBody TransferRequest req,
                                                     Authentication auth) {
        return ResponseEntity.ok(service.transfer(currentUserId(auth), req));
    }

    // ==================================================================
    // 2. PAGINATED HISTORY
    // ==================================================================
    @GetMapping("/history")
    public ResponseEntity<Page<TransactionView>> history(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        return ResponseEntity.ok(service.history(currentUserId(auth), page, size));
    }

    // ==================================================================
    // 3. FULL HISTORY — for CSV export
    // ==================================================================
    @GetMapping("/history/all")
    public ResponseEntity<List<TransactionView>> allHistory(Authentication auth) {
        return ResponseEntity.ok(service.history(currentUserId(auth)));
    }

    // ==================================================================
    // 4. SINGLE TRANSACTION BY ID
    // ==================================================================
    @GetMapping("/{txnId}")
    public ResponseEntity<TransactionView> byId(@PathVariable UUID txnId, Authentication auth) {
        return ResponseEntity.ok(service.getTransaction(currentUserId(auth), txnId));
    }

    // ==================================================================
    // 5. LOOKUP BY REQUEST ID
    // ==================================================================
    @GetMapping("/by-request-id/{requestId}")
    public ResponseEntity<TransactionView> byRequestId(@PathVariable String requestId,
                                                       Authentication auth) {
        return ResponseEntity.ok(service.getByRequestId(currentUserId(auth), requestId));
    }

    // ==================================================================
    // 6. FILTERED SEARCH
    // ==================================================================
    @GetMapping("/search")
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
        return ResponseEntity.ok(service.search(
                currentUserId(auth), page, size, direction, from, to, minAmount, maxAmount, q));
    }

    // ==================================================================
    // 7. CANCEL A PENDING TRANSFER
    // ==================================================================
    @PostMapping("/{txnId}/cancel")
    public ResponseEntity<TransferResponse> cancel(@PathVariable UUID txnId, Authentication auth) {
        return ResponseEntity.ok(service.cancel(currentUserId(auth), txnId));
    }

    // ==================================================================
    // 8. REVERSE WITHIN 15-MINUTE WINDOW
    // ==================================================================
    @PostMapping("/{txnId}/reverse")
    public ResponseEntity<TransferResponse> reverse(@PathVariable UUID txnId, Authentication auth) {
        return ResponseEntity.ok(service.reverse(currentUserId(auth), txnId));
    }

    // ==================================================================
    // 9. STATS
    // ==================================================================
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats(Authentication auth) {
        return ResponseEntity.ok(service.stats(currentUserId(auth)));
    }

    // ==================================================================
    // 10. RECENT COUNTERPARTIES
    // ==================================================================
    @GetMapping("/counterparties")
    public ResponseEntity<List<Map<String, Object>>> counterparties(Authentication auth) {
        return ResponseEntity.ok(service.recentCounterparties(currentUserId(auth)));
    }

    // ==================================================================
    // 11. ADMIN: ALL TRANSACTIONS
    // ==================================================================
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('BANK')")
    public ResponseEntity<Page<TransactionView>> adminAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(service.allTransactions(page, size));
    }

    // ==================================================================
    // 12. ADMIN: SEARCH A USER'S TRANSACTIONS
    // ==================================================================
    @GetMapping("/admin/by-user/{userId}")
    @PreAuthorize("hasRole('BANK')")
    public ResponseEntity<Page<TransactionView>> adminByUser(
            @PathVariable UUID userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.history(userId, page, size));
    }

    // ==================================================================
    // 13. NEW — TRANSFER PREVIEW (calculate fees, total debit, recipient)
    //      No side effects; safe to call before confirming.
    // ==================================================================
    @PostMapping("/preview")
    public ResponseEntity<Map<String, Object>> preview(@Valid @RequestBody TransferRequest req,
                                                       Authentication auth) {
        return ResponseEntity.ok(service.preview(currentUserId(auth), req));
    }

    // ==================================================================
    // 14. NEW — FEE CALCULATION (no lookup, just fee math)
    // ==================================================================
    @GetMapping("/fee")
    public ResponseEntity<Map<String, Object>> fee(@RequestParam BigDecimal amount) {
        return ResponseEntity.ok(service.calculateFee(amount));
    }

    // ==================================================================
    // 15. NEW — IDEMPOTENCY CHECK: has this requestId already gone through?
    // ==================================================================
    @GetMapping("/exists/{requestId}")
    public ResponseEntity<Map<String, Object>> exists(@PathVariable String requestId) {
        boolean exists = service.requestIdExists(requestId);
        return ResponseEntity.ok(Map.of(
                "requestId", requestId,
                "exists", exists));
    }

    // ==================================================================
    // 16. NEW — BULK TRANSFER: several transfers in one atomic call
    //      Each row is independent; partial failure returns per-row results.
    // ==================================================================
    @PostMapping("/bulk")
    public ResponseEntity<List<Map<String, Object>>> bulk(
            @RequestBody List<TransferRequest> reqs, Authentication auth) {
        return ResponseEntity.ok(service.bulkTransfer(currentUserId(auth), reqs));
    }

    // ==================================================================
    // 17. NEW — SCHEDULE A FUTURE TRANSFER
    //      (In-process queue; persistence requires a scheduled_transfers table)
    // ==================================================================
    public record ScheduleRequest(
            TransferRequest transfer,
            Instant executeAt) {}

    @PostMapping("/schedule")
    public ResponseEntity<Map<String, Object>> schedule(
            @RequestBody ScheduleRequest req, Authentication auth) {
        return ResponseEntity.ok(service.schedule(currentUserId(auth), req.transfer(), req.executeAt()));
    }

    // ==================================================================
    // 18. NEW — SAVE A TRANSFER TEMPLATE FOR QUICK REPEAT
    //      (In-memory; persistence requires a transfer_templates table)
    // ==================================================================
    public record TemplateRequest(
            String nickname,
            UUID fromAccountId,
            UUID toAccountId,
            BigDecimal amount) {}

    @PostMapping("/templates")
    public ResponseEntity<Map<String, Object>> saveTemplate(
            @RequestBody TemplateRequest req, Authentication auth) {
        return ResponseEntity.ok(service.saveTemplate(currentUserId(auth), req.nickname(),
                req.fromAccountId(), req.toAccountId(), req.amount()));
    }

    @GetMapping("/templates")
    public ResponseEntity<List<Map<String, Object>>> templates(Authentication auth) {
        return ResponseEntity.ok(service.listTemplates(currentUserId(auth)));
    }

    @DeleteMapping("/templates/{nickname}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable String nickname, Authentication auth) {
        service.deleteTemplate(currentUserId(auth), nickname);
        return ResponseEntity.noContent().build();
    }

    // ==================================================================
    // 19. NEW — APPLY A TEMPLATE (execute a saved transfer)
    // ==================================================================
    @PostMapping("/templates/{nickname}/execute")
    public ResponseEntity<TransferResponse> executeTemplate(
            @PathVariable String nickname, Authentication auth) {
        return ResponseEntity.ok(service.executeTemplate(currentUserId(auth), nickname));
    }

    // ==================================================================
    // 20. NEW — STATEMENT (monthly summary, computed from history)
    // ==================================================================
    @GetMapping("/statement")
    public ResponseEntity<Map<String, Object>> statement(
            @RequestParam int year,
            @RequestParam int month,
            Authentication auth) {
        return ResponseEntity.ok(service.monthlyStatement(currentUserId(auth), year, month));
    }

    // ==================================================================
    private UUID currentUserId(Authentication auth) {
        return UUID.fromString((String) auth.getPrincipal());
    }
}