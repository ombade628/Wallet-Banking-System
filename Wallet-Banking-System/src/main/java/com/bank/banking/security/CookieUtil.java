package com.bank.banking.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class CookieUtil {
    private final boolean secure;
    public CookieUtil(@Value("${app.jwt.cookie-secure:false}") boolean secure) { this.secure = secure; }
    public ResponseCookie token(String value, long seconds) { return ResponseCookie.from("BANK_TOKEN", value).httpOnly(true).secure(secure).sameSite("Lax").path("/").maxAge(seconds).build(); }
}
