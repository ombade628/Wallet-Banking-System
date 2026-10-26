package com.bank.banking.controller;

import com.bank.banking.service.*;
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
    
    
    public DashboardController(AccountService accounts, TransferService transfers, UserService users) 
    { 
    	this.accounts = accounts; 
    	this.transfers = transfers; 
    	this.users = users; 
    	
    }
    
    @GetMapping({"/", "/dashboard"}) 
    public String dashboard(Authentication auth, Model model) 
    { 
    	UUID id = id(auth); 
    	model.addAttribute("user", users.get(id)); 
    	model.addAttribute("accounts", accounts.listOwned(id)); 
    	model.addAttribute("transactions", transfers.history(id).stream().limit(5).toList()); 
    	return "dashboard"; 
    	
    }
    
    @GetMapping("/accounts") 
    public String accounts(Authentication auth, Model model) 
    { 
    	model.addAttribute("accounts", accounts.listOwned(id(auth))); 
    	return "accounts/list"; 
    	
    }
    
    @GetMapping("/accounts/new") 
    public String newAccount() 
    { 
    	return "accounts/new"; 
    	
    }
    
    
    @GetMapping("/accounts/{accountId}") 
    public String detail(@PathVariable UUID accountId, Authentication auth, Model model) 
    
    { 
    	model.addAttribute("account", accounts.get(accountId, id(auth))); 
    	model.addAttribute("transactions", accounts.history(accountId)); 
    	return "accounts/detail"; 
    	
    }
    @GetMapping("/transfers/new") 
    public String transfer(Authentication auth, Model model) 
    { 
    	model.addAttribute("accounts", accounts.listOwned(id(auth))); 
    	return "transfers/new"; 
    	
    }
    
    
    @GetMapping("/transfers/success") 
    public String success()
    { 
    	return "transfers/success"; 
    	
    }
    
    @GetMapping("/transactions") 
    public String history(Authentication auth, Model model) 
    { 
    	model.addAttribute("transactions", transfers.history(id(auth))); 
    	return "transactions/history"; 
    	
    }
    
    
    @GetMapping("/login") 
    public String login() 
    { 
    	
    	return "auth/login"; 
    	
    }
    
    @GetMapping("/register") 
    public String register() 
    { 
    	return "auth/register"; 
    	
    }
    
    
    private UUID id(Authentication authentication) 
    { 
    	return UUID.fromString((String) authentication.getPrincipal()); 
    	
    }
}
