package com.bank.banking.security;

import com.bank.banking.model.entity.User;
import com.bank.banking.repository.UserRepo;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;
@Service
public class CustomUserDetailsService implements UserDetailsService {
	private final UserRepo users;
	public CustomUserDetailsService(UserRepo users) {
		this.users = users; 
	}

	@Override
	public UserDetails loadUserByUsername(String email) {
		User user = users.
				findByEmail(email.toLowerCase())
				.orElseThrow
				(() -> new UsernameNotFoundException("User not found"));
		
		
		return org.springframework
		        .security.core
		        .userdetails.User
		        .withUsername(user.getEmail())
		        .password(user.getPasswordHash())
		        .authorities(
		            user.getRoles().stream()
		                .map(userRole -> new SimpleGrantedAuthority(
		                        "ROLE_" + userRole.getRole().name()))
		                .toList()
		        )
		        .disabled(!user.isEnabled())
		        .build();
	}
}
