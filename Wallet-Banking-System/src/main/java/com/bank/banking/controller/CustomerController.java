package com.bank.banking.controller;

import com.bank.banking.model.dto.TransferRequest;
import com.bank.banking.service.UserService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customer")
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerController {

    private final UserService userService;

    public CustomerController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/dashboard")
    public String dashboard() {
        return userService.getDashboard();
    }

    @PostMapping("/transfer")
    public String transfer(@Valid @RequestBody TransferRequest request) {
        return userService.transfer(request);
    }

    @PostMapping("/loan")
    public String requestLoan() {
        return userService.requestLoan();
    }

    @GetMapping("/transactions")
    public String transactions() {
        return userService.getTransactions();
    }
}