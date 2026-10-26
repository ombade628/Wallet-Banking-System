package com.bank.banking.controller;

import com.bank.banking.model.entity.UserRole;
import com.bank.banking.service.UserService;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/manager")
public class ManagerController {
	
	UserRole user ; 

    private final UserService userService;

    public ManagerController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/dashboard")
    public String dashboard() {
        return userService.getDashboard();
    }

    @PostMapping("/loan/{loanId}/approve")
    public String approveLoan(@PathVariable Long loanId) {
        return userService.approveLoan(loanId);
    }
    
    @PreAuthorize("hasRole('MANAGER')")
    @GetMapping("/workers")
    public String manageWorkers() {
        return userService.manageWorkers();
    }

    @GetMapping("/salary")
    public String salary() {
        return userService.salary();
    }

    @PostMapping("/promotion")
    public String promotion() {
        return userService.promotion();
    }
}