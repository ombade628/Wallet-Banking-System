package com.bank.banking.controller;

import com.bank.banking.model.dto.DepositRequest;
import com.bank.banking.model.dto.DepositResponse;
import com.bank.banking.model.dto.TransactionResponse;
import com.bank.banking.service.AccountService;
import com.bank.banking.service.TransactionService;
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
@RequestMapping("/api/cashier")
@PreAuthorize("hasRole('CASHIER')")
public class CashierController {

    private final TransactionService transactions;
    private final AccountService accounts;

    public CashierController(TransactionService transactions, AccountService accounts) {
        this.transactions = transactions;
        this.accounts = accounts;
    }

    // ---------- request DTOs ----------
    public record WithdrawRequest(String accountNumber, BigDecimal amount) {}
    public record ChequeRequest(String accountNumber, BigDecimal amount) {}

    // ==================================================================
    // 1. DEPOSIT
    // ==================================================================
    @PostMapping("/deposit")
    public ResponseEntity<DepositResponse> deposit(@Valid @RequestBody DepositRequest req) {
        return ResponseEntity.ok(transactions.deposit(req));
    }

    // ==================================================================
    // 2. WITHDRAW
    // ==================================================================
    @PostMapping("/withdraw")
    public ResponseEntity<TransactionResponse> withdraw(@Valid @RequestBody WithdrawRequest req) {
        return ResponseEntity.ok(transactions.withdraw(req.accountNumber(), req.amount()));
    }

    // ==================================================================
    // 3. LOOKUP — verify account before posting cash
    // ==================================================================
    @GetMapping("/lookup/{accountNumber}")
    public ResponseEntity<?> lookup(@PathVariable String accountNumber) {
        return accounts.lookup(accountNumber)
                .<ResponseEntity<?>>map(a -> ResponseEntity.ok(Map.of(
                        "accountId", a.id(),
                        "ownerName", a.ownerName())))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // ==================================================================
    // 4. BALANCE — full account snapshot before post
    // ==================================================================
    @GetMapping("/balance/{accountNumber}")
    public ResponseEntity<?> balance(@PathVariable String accountNumber) {
        return accounts.lookup(accountNumber)
                .<ResponseEntity<?>>map(a -> ResponseEntity.ok(Map.of(
                        "accountId", a.id(),
                        "ownerName", a.ownerName())))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // ==================================================================
    // 5. BATCH DEPOSIT — post multiple deposits in one request
    // ==================================================================
    @PostMapping("/deposit/batch")
    public ResponseEntity<List<DepositResponse>> batchDeposit(
            @Valid @RequestBody List<DepositRequest> reqs) {
        return ResponseEntity.ok(transactions.batchDeposit(reqs));
    }

    // ==================================================================
    // 6. REVERSAL — undo a transaction within 15 minutes
    // ==================================================================
    @PostMapping("/reverse/{txnId}")
    public ResponseEntity<TransactionResponse> reverse(@PathVariable UUID txnId) {
        return ResponseEntity.ok(transactions.reverse(txnId));
    }

    // ==================================================================
    // 7. CHEQUE CLEARANCE — debit an account for a cheque
    // ==================================================================
    @PostMapping("/cheque/clear")
    public ResponseEntity<TransactionResponse> chequeClear(@Valid @RequestBody ChequeRequest req) {
        return ResponseEntity.ok(transactions.chequeClear(req.accountNumber(), req.amount()));
    }

    // ==================================================================
    // 8. DRAWER TOTALS — daily cash position
    // ==================================================================
    @GetMapping("/drawer")
    public ResponseEntity<Map<String, Object>> drawer() {
        return ResponseEntity.ok(transactions.drawerTotals());
    }

    // ==================================================================
    // 9. SLIP DATA — printable receipt fields
    // ==================================================================
    @GetMapping("/slip/{txnId}")
    public ResponseEntity<Map<String, Object>> slip(@PathVariable UUID txnId) {
        return ResponseEntity.ok(transactions.slipData(txnId));
    }

    // ==================================================================
    // 10. ACCOUNT TRANSACTIONS — last N rows for a specific account
    // ==================================================================
    @GetMapping("/history/{accountNumber}")
    public ResponseEntity<?> accountHistory(@PathVariable String accountNumber,
                                            @RequestParam(defaultValue = "20") int size) {
        var opt = accounts.lookup(accountNumber);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(accounts.history(opt.get().id()).stream().limit(size).toList());
    }
}