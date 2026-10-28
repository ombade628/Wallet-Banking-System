package com.bank.banking.controller;

import com.bank.banking.service.AccountService;
import com.bank.banking.service.LoanService;
import com.bank.banking.service.TransferService;
import com.bank.banking.service.UserService;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Controller
public class DashboardController {

    private final AccountService accounts;
    private final TransferService transfers;
    private final UserService users;
    private final LoanService loans;

    public DashboardController(AccountService accounts,
                               TransferService transfers,
                               UserService users,
                               LoanService loans) {
        this.accounts = accounts;
        this.transfers = transfers;
        this.users = users;
        this.loans = loans;
    }

    // ==================================================================
    // HOME / DASHBOARD
    // ==================================================================
    @GetMapping({"/", "/dashboard"})
    public String dashboard(Authentication auth, Model model) {
        if (!isLoggedIn(auth)) return "redirect:/login";
        UUID id = id(auth);
        model.addAttribute("user", users.get(id));
        model.addAttribute("accounts", accounts.listOwned(id));
        model.addAttribute("transactions", transfers.history(id, 0, 5).getContent());
        model.addAttribute("loanCount", loans.forCustomer(id).size());
        return "dashboard";
    }

    // ==================================================================
    // ACCOUNTS
    // ==================================================================
    @GetMapping("/accounts")
    public String accounts(Authentication auth, Model model) {
        if (!isLoggedIn(auth)) return "redirect:/login";
        model.addAttribute("accounts", accounts.listOwned(id(auth)));
        return "accounts/list";
    }

    @GetMapping("/accounts/new")
    public String newAccount(Authentication auth) {
        if (!isLoggedIn(auth)) return "redirect:/login";
        return "accounts/new";
    }

    @GetMapping("/accounts/{accountId}")
    public String detail(@PathVariable UUID accountId, Authentication auth, Model model) {
        if (!isLoggedIn(auth)) return "redirect:/login";
        model.addAttribute("account", accounts.get(accountId, id(auth)));
        model.addAttribute("transactions", accounts.history(accountId));
        return "accounts/detail";
    }

    // ==================================================================
    // TRANSFERS
    // ==================================================================
    @GetMapping("/transfers/new")
    public String transfer(Authentication auth, Model model) {
        if (!isLoggedIn(auth)) return "redirect:/login";
        model.addAttribute("accounts", accounts.listOwned(id(auth)));
        return "transfers/new";
    }

    @GetMapping("/transfers/success")
    public String success(Authentication auth) {
        if (!isLoggedIn(auth)) return "redirect:/login";
        return "transfers/success";
    }

    // ==================================================================
    // TRANSACTIONS
    // ==================================================================
    @GetMapping("/transactions")
    public String history(Authentication auth, Model model) {
        if (!isLoggedIn(auth)) return "redirect:/login";
        model.addAttribute("transactions", transfers.history(id(auth), 0, 50).getContent());
        return "transactions/history";
    }

    // ==================================================================
    // LOANS
    // ==================================================================
    @GetMapping("/loans")
    public String loansPage(Authentication auth, Model model) {
        if (!isLoggedIn(auth)) return "redirect:/login";
        model.addAttribute("loans", loans.forCustomer(id(auth)));
        return "loans/list";
    }

    // ==================================================================
    // PROFILE
    // ==================================================================
    @GetMapping("/profile")
    public String profile(Authentication auth, Model model) {
        if (!isLoggedIn(auth)) return "redirect:/login";
        model.addAttribute("user", users.get(id(auth)));
        model.addAttribute("accounts", accounts.listOwned(id(auth)));
        return "profile";
    }

    // ==================================================================
    // PUBLIC PAGES
    // ==================================================================
    @GetMapping("/login")
    public String login() {
        return "auth/login";
    }

    @GetMapping("/register")
    public String register() {
        return "auth/register";
    }

    // ==================================================================
    // HELPERS
    // ==================================================================
    private boolean isLoggedIn(Authentication auth) {
        return auth != null
                && auth.isAuthenticated()
                && !(auth instanceof AnonymousAuthenticationToken);
    }

    private UUID id(Authentication authentication) {
        return UUID.fromString((String) authentication.getPrincipal());
    }
}