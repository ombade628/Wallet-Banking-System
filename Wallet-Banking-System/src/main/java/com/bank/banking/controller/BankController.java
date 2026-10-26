package com.bank.banking.controller;

import com.bank.banking.model.dto.TransferRequest;
import com.bank.banking.service.UserService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bank")
public class BankController {

    private final UserService userService;
    

    public BankController(UserService userService) 
    {
        this.userService = userService;
    }

    
    @GetMapping("/dashboard")
    public String dashboard() 
    {
        return userService.getDashboard();
    }

    @PostMapping("/account/customer")
    public String addAccount() 
    {
        return userService.addAccount();
    }
    @PostMapping("/account/manager")
    public String addManagerAccount() 
    {
        return userService.addAccount();
    }

//    @PostMapping("/loan/approve")
    @PostMapping("/loan/{loanId}/approve")
    public String approveLoan(@PathVariable Long loanId) {

        return userService.approveLoan(loanId);
    }
    
    
    @GetMapping("/transactions")
    public String transactions() 
    {
        return userService.getTransactions();
    }

    @PostMapping("/transfer")
    public String transfer(@RequestBody TransferRequest request) {
        return userService.transfer(request);
    } 
}