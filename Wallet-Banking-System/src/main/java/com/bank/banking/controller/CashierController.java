package com.bank.banking.controller;

import com.bank.banking.model.dto.DepositRequest;
import com.bank.banking.model.dto.TransactionResponse;
import com.bank.banking.service.UserService;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/api/cashier")
@PreAuthorize("hasRole('CASHIER')")
public class CashierController {

    private final UserService userService;

    public CashierController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/dashboard")
    public String dashboard() {
        return userService.getDashboard();
    }

    @PostMapping("/deposit")
    public ResponseEntity<TransactionResponse> deposit(
            @Valid @RequestBody DepositRequest req) {
        return ResponseEntity.ok(userService.deposit(req));
    }


    @PostMapping("/withdraw")
    public String withdraw() {
        return userService.withdraw();
    }
}