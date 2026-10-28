package com.bank.banking.controller;

import com.bank.banking.model.dto.AccountResponse;
import com.bank.banking.model.dto.CreateAccountRequest;
import com.bank.banking.model.dto.TransactionView;
import com.bank.banking.model.dto.TransferRequest;
import com.bank.banking.model.dto.TransferResponse;
import com.bank.banking.model.entity.Loan;
import com.bank.banking.service.AccountService;
import com.bank.banking.service.LoanService;
import com.bank.banking.service.TransferService;
import jakarta.validation.Valid;
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
@RequestMapping("/api/customer")
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerController {

    private final TransferService transferService;
    private final AccountService accountService;
    private final LoanService loanService;

    public CustomerController(TransferService transferService,
                              AccountService accountService,
                              LoanService loanService) {
        this.transferService = transferService;
        this.accountService = accountService;
        this.loanService = loanService;
    }

    // ==================================================================
    // 1. DASHBOARD — accounts + recent transactions + loans
    // ==================================================================
    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard(Authentication auth) {
        UUID customerId = currentUserId(auth);
        List<AccountResponse> accounts = accountService.listOwned(customerId);
        // Page<TransactionView> → .getContent() to get List
        var recent = transferService.history(customerId, 0, 10).getContent();
        var loans = loanService.forCustomer(customerId);
        return ResponseEntity.ok(Map.of(
                "accounts", accounts,
                "recentTransactions", recent,
                "loans", loans));
    }

    // ==================================================================
    // 2. TRANSFER
    // ==================================================================
    @PostMapping("/transfer")
    public ResponseEntity<TransferResponse> transfer(@Valid @RequestBody TransferRequest req,
                                                     Authentication auth) {
        // TransferService enforces fromAccount.owner == caller
        return ResponseEntity.ok(transferService.transfer(currentUserId(auth), req));
    }

    // ==================================================================
    // 3. TRANSACTIONS — paginated
    // ==================================================================
    @GetMapping("/transactions")
    public ResponseEntity<Page<TransactionView>> transactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication auth) {
        return ResponseEntity.ok(transferService.history(currentUserId(auth), page, size));
    }

    // ==================================================================
    // 4. ACCOUNTS — customer's own accounts
    // ==================================================================
    @GetMapping("/accounts")
    public ResponseEntity<List<AccountResponse>> accounts(Authentication auth) {
        return ResponseEntity.ok(accountService.listOwned(currentUserId(auth)));
    }

    // ==================================================================
    // 5. NEW ACCOUNT — customer opens one
    // ==================================================================
    @PostMapping("/accounts")
    public ResponseEntity<AccountResponse> createAccount(@Valid @RequestBody CreateAccountRequest req,
                                                         Authentication auth) {
        return ResponseEntity.ok(accountService.create(currentUserId(auth), req));
    }

    // ==================================================================
    // 6. ACTIVATE — customer activates their PENDING account
    // ==================================================================
    @PostMapping("/accounts/{id}/activate")
    public ResponseEntity<AccountResponse> activate(@PathVariable UUID id, Authentication auth) {
        return ResponseEntity.ok(accountService.activate(id, currentUserId(auth)));
    }

    // ==================================================================
    // 7. FREEZE OWN ACCOUNT
    // ==================================================================
    @PutMapping("/accounts/{id}/freeze")
    public ResponseEntity<AccountResponse> freeze(@PathVariable UUID id, Authentication auth) {
        accountService.get(id, currentUserId(auth));
        accountService.freeze(id);
        return ResponseEntity.ok(accountService.get(id, currentUserId(auth)));
    }

    // ==================================================================
    // 8. UNFREEZE OWN ACCOUNT
    // ==================================================================
    @PutMapping("/accounts/{id}/unfreeze")
    public ResponseEntity<AccountResponse> unfreeze(@PathVariable UUID id, Authentication auth) {
        accountService.get(id, currentUserId(auth));
        accountService.unfreeze(id);
        return ResponseEntity.ok(accountService.get(id, currentUserId(auth)));
    }

    // ==================================================================
    // 9. LOOKUP ACCOUNT BY NUMBER — for transfer recipient
    // ==================================================================
    @GetMapping("/accounts/lookup/{number}")
    public ResponseEntity<?> lookup(@PathVariable String number) {
        return accountService.lookup(number)
                .<ResponseEntity<?>>map(a -> ResponseEntity.ok(Map.of(
                        "accountId", a.id(),
                        "ownerName", a.ownerName())))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // ==================================================================
    // 10. ACCOUNT TRANSACTIONS — one account's history
    // ==================================================================
    @GetMapping("/accounts/{id}/transactions")
    public ResponseEntity<?> accountTransactions(@PathVariable UUID id, Authentication auth) {
        accountService.get(id, currentUserId(auth));
        return ResponseEntity.ok(accountService.history(id));
    }

    // ==================================================================
    // 11. TOTAL BALANCE — sum across active accounts
    // ==================================================================
    @GetMapping("/balance/total")
    public ResponseEntity<Map<String, Object>> totalBalance(Authentication auth) {
        return ResponseEntity.ok(accountService.totalBalance(currentUserId(auth)));
    }

    // ==================================================================
    // 12. ACCOUNT SUMMARY — counts by status/type
    // ==================================================================
    @GetMapping("/accounts/summary")
    public ResponseEntity<Map<String, Object>> accountSummary(Authentication auth) {
        return ResponseEntity.ok(accountService.summary(currentUserId(auth)));
    }

    // ==================================================================
    // 13. LOANS — customer's own loans
    // ==================================================================
    @GetMapping("/loans")
    public ResponseEntity<List<Loan>> loans(Authentication auth) {
        return ResponseEntity.ok(loanService.forCustomer(currentUserId(auth)));
    }

    // ==================================================================
    // 14. APPLY FOR LOAN
    // ==================================================================
    public record ApplyLoan(BigDecimal amount, BigDecimal interestRate, int tenureMonths) {}

    @PostMapping("/loans")
    public ResponseEntity<Loan> applyLoan(@RequestBody ApplyLoan req, Authentication auth) {
        return ResponseEntity.ok(loanService.apply(
                currentUserId(auth),
                req.amount(),
                req.interestRate(),
                req.tenureMonths()));
    }

    // ==================================================================
    // 15. TRANSFER STATS — quick totals for dashboard card
    // ==================================================================
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats(Authentication auth) {
        return ResponseEntity.ok(transferService.stats(currentUserId(auth)));
    }

    // ==================================================================
    // 16. RECENT COUNTERPARTIES — for payee autocomplete
    // ==================================================================
    @GetMapping("/counterparties")
    public ResponseEntity<List<Map<String, Object>>> counterparties(Authentication auth) {
        return ResponseEntity.ok(transferService.recentCounterparties(currentUserId(auth)));
    }

    // ==================================================================
    private UUID currentUserId(Authentication auth) {
        return UUID.fromString((String) auth.getPrincipal());
    }
}