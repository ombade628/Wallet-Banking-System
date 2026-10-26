package com.bank.banking.controller;

import com.bank.banking.model.dto.AuthResponse;
import com.bank.banking.model.dto.LoginRequest;
import com.bank.banking.model.dto.RegisterRequest;
import com.bank.banking.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import com.bank.banking.security.CookieUtil;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;
    private final CookieUtil cookies;

    public AuthController(AuthService auth, CookieUtil cookies) 
    { 
    	this.auth = auth;
    	this.cookies = cookies; 
    	}

    
    @PostMapping("/register")
    public ResponseEntity<String> register(@Valid @RequestBody RegisterRequest req) {

        String response = auth.register(req);

        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        System.out.println("API LOGIN HIT");
        AuthResponse response = auth.login(req);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout() { return ResponseEntity.noContent().header(HttpHeaders.SET_COOKIE, cookies.token("", 0).toString()).build(); }
}
