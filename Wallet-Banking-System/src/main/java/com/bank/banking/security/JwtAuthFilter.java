package com.bank.banking.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
	private final JwtService jwt;

	public JwtAuthFilter(JwtService jwt) {
		this.jwt = jwt;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		String token = request.getHeader("Authorization");
		if (token != null && token.startsWith("Bearer "))
			token = token.substring(7);
		else if (request.getCookies() != null)
			for (Cookie cookie : request.getCookies())
				if ("BANK_TOKEN".equals(cookie.getName())) {
					token = cookie.getValue();
					break;
				}
		if (token != null && SecurityContextHolder.getContext().getAuthentication() == null)
			try {
				Claims claims = jwt.parse(token);
				String role = claims.get("role", String.class);
				SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
						claims.getSubject(), null, List.of(new SimpleGrantedAuthority("ROLE_" + role))));
			} catch (Exception ignored) {
				SecurityContextHolder.clearContext();
			}
		chain.doFilter(request, response);
	}
}
