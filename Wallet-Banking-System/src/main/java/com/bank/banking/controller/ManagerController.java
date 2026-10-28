package com.bank.banking.controller;

import com.bank.banking.model.entity.Loan;
import com.bank.banking.model.entity.LoanStatus;
import com.bank.banking.model.entity.Role;
import com.bank.banking.model.entity.User;
import com.bank.banking.service.AccountService;
import com.bank.banking.service.LoanService;
import com.bank.banking.service.StaffService;
import com.bank.banking.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/manager")
@PreAuthorize("hasRole('MANAGER')")
public class ManagerController {

	private final UserService users;
	private final LoanService loans;
	private final StaffService staff;
	private final AccountService accounts;

	public ManagerController(UserService users, LoanService loans, StaffService staff, AccountService accounts) {
		this.users = users;
		this.loans = loans;
		this.staff = staff;
		this.accounts = accounts;
	}

	// ==================================================================
	// DASHBOARD
	// ==================================================================
	@GetMapping("/dashboard")
	public ResponseEntity<Map<String, Object>> dashboard() {
		return ResponseEntity.ok(Map.of("pendingLoans", loans.countByStatus(LoanStatus.PENDING), "pendingAccounts",
				accounts.countByStatus("PENDING"), "managers", users.getByRole(Role.MANAGER).size(), "cashiers",
				users.getByRole(Role.CASHIER).size()));
	}

	@PostMapping("/accounts/{id}/close")
	public ResponseEntity<?> closeAccount(@PathVariable UUID id, Authentication auth) {
		UUID caller = UUID.fromString((String) auth.getPrincipal());
		accounts.close(id, caller);
		return ResponseEntity.noContent().build();
	}

	// ==================================================================
	// LOANS
	// ==================================================================
	@GetMapping("/loans")
	public ResponseEntity<?> loans(@RequestParam(defaultValue = "PENDING") String status) {
		LoanStatus parsed;
		try {
			parsed = LoanStatus.valueOf(status.toUpperCase());
		} catch (IllegalArgumentException e) {
			return ResponseEntity.badRequest().body(Map.of("error", "Invalid status: " + status));
		}
		return ResponseEntity.ok(loans.byStatus(parsed));
	}

	@GetMapping("/loans/{id}")
	public ResponseEntity<?> loanById(@PathVariable Long id, Authentication auth) {
		UUID caller = UUID.fromString((String) auth.getPrincipal());
		return ResponseEntity.ok(loans.getForCaller(id, caller, true));
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
	// ACCOUNTS — pending → active workflow
	// ==================================================================
	@GetMapping("/accounts")
	public ResponseEntity<?> accountsByStatus(@RequestParam(defaultValue = "PENDING") String status) {
		return ResponseEntity.ok(accounts.byStatus(status));
	}

	@GetMapping("/accounts/{id}")
	public ResponseEntity<?> accountById(@PathVariable UUID id) {
		return ResponseEntity.ok(accounts.getById(id));
	}

	@PostMapping("/accounts/{id}/activate")
	public ResponseEntity<?> activateAccount(@PathVariable UUID id, Authentication auth) {
		// MANAGER authorization is already enforced at the class level
		// (@PreAuthorize("hasRole('MANAGER')")) so no per-account ownership check is
		// needed.
		// Reuse the same path BANK uses (no owner assertion).
		return ResponseEntity.ok(accounts.adminActivate(id));
	}

	@PostMapping("/accounts/{id}/suspend")
	public ResponseEntity<?> suspendAccount(@PathVariable UUID id, Authentication auth) {
		UUID caller = UUID.fromString((String) auth.getPrincipal());
		return ResponseEntity.ok(accounts.suspend(id, caller));
	}

	// ==================================================================
	// LEGACY CASHIER CREATION (other staff endpoints live in StaffController)
	// ==================================================================
	public record CreateCashier(@NotBlank @Email String email, @NotBlank @Size(min = 8, max = 100) String password,
			@NotBlank String fullName) {
	}

	@PostMapping("/staff/cashier")
	public ResponseEntity<?> createCashier(@Valid @RequestBody CreateCashier req, Authentication auth) {
		User u = staff.createCashier(req.email(), req.password(), req.fullName(), auth);
		return ResponseEntity.ok(Map.of("id", u.getId(), "email", u.getEmail(), "fullName", u.getFullName()));
	}

	// FREEZE ANY ACCOUNT
	@PostMapping("/accounts/{id}/freeze")
	public ResponseEntity<?> freezeAccount(@PathVariable UUID id) {
		accounts.freeze(id);
		return ResponseEntity.ok(accounts.getById(id));
	}
	//unfreeze account
	@PostMapping("/accounts/{id}/unfreeze")
	public ResponseEntity<?> unfreezeAccount(@PathVariable UUID id) {
		accounts.unfreeze(id);
		return ResponseEntity.ok(accounts.getById(id));
	}
}