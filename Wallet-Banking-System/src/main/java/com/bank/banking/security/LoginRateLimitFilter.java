package com.bank.banking.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class LoginRateLimitFilter extends OncePerRequestFilter {

    private record Attempt(int count, long resetAt) {}
    private final Map<String, Attempt> attempts = new ConcurrentHashMap<>();
    private static final int MAX = 5;
    private static final long WINDOW_MS = 15 * 60 * 1000;

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

    	if (!"POST".equalsIgnoreCase(req.getMethod()) || !req.getRequestURI().endsWith("/api/auth/login")) {
            chain.doFilter(req, res);
            return;
        }
        String ip = req.getRemoteAddr();
        long now = System.currentTimeMillis();
        Attempt a = attempts.getOrDefault(ip, new Attempt(0, now + WINDOW_MS));
        if (now > a.resetAt()) a = new Attempt(0, now + WINDOW_MS);
        if (a.count() >= MAX) {
            res.setStatus(429);
            res.getWriter().write("{\"message\":\"Too many login attempts. Try again later.\"}");
            return;
        }
        attempts.put(ip, new Attempt(a.count() + 1, a.resetAt()));
        chain.doFilter(req, res);
    }
}