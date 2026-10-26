package com.bank.banking.controller;

import com.bank.banking.model.dto.AccountResponse;
import com.bank.banking.model.dto.CreateAccountRequest;
import com.bank.banking.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.Map;


@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountService service;

    public AccountController(AccountService service) 
    { 
    	this.service = service; 
    }

    @PostMapping
    public ResponseEntity<AccountResponse> create(@Valid @RequestBody CreateAccountRequest req,
                                                  Authentication auth) 
    {
        return ResponseEntity.ok(service.create(currentUserId(auth), req));
    }
    
    

    @GetMapping
    public ResponseEntity<List<AccountResponse>> list(Authentication auth) {
        return ResponseEntity.ok(service.listOwned(currentUserId(auth)));
    }
    
    

    @GetMapping("/{id}")
    public ResponseEntity<AccountResponse> get(@PathVariable UUID id, Authentication auth) {
        return ResponseEntity.ok(service.get(id, currentUserId(auth)));
    }
    
    
    @GetMapping("/lookup/{number}")
    public ResponseEntity<?> lookup(@RequestParam String number) {
        return service.lookup(number)
        		
        		.<ResponseEntity<?>>map(a -> ResponseEntity.ok
        				(Map.of("accountId", a.id(), "ownerName", a.ownerName())))
        		
        		.orElseGet(() -> ResponseEntity.notFound().build());
        
    }
    
    
    @GetMapping("/{id}/transactions")
    public ResponseEntity<?> transactions(@PathVariable UUID id, Authentication auth) 
    { 
    	service.get(id, currentUserId(auth)); 
    	return ResponseEntity.ok(service.history(id)); 
    }

    private UUID currentUserId(Authentication auth) {
        return UUID.fromString((String) auth.getPrincipal());
    }
}
