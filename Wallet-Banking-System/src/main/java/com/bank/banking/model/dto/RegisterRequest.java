package com.bank.banking.model.dto;

import com.bank.banking.model.entity.Role;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @Email
    @NotBlank
    String email,
    
    @NotBlank
    @Size(min = 8, max = 100) 
    String password,
    
    @NotBlank 
    @Size(max = 255)
    String fullName, 
    
    Role role
) {}