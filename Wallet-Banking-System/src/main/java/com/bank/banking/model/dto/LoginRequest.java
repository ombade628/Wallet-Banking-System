package com.bank.banking.model.dto;

import com.bank.banking.model.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LoginRequest(
		@Email
		@NotBlank 
		String email,
		
		@NotBlank 
		String password,
		
		@NotNull
		Role role
		){
	
	
}