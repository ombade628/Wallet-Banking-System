package com.bank.banking.controller;

import com.bank.banking.model.dto.TransferRequest;
import com.bank.banking.model.dto.TransferResponse;
import com.bank.banking.service.TransferService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/transfers")
public class TransferController {

    private final TransferService service;

    public TransferController(TransferService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<TransferResponse> transfer(@Valid @RequestBody TransferRequest req,
                                                     Authentication auth) {
        return ResponseEntity.ok(service.transfer(currentUserId(auth), req));
    }

    private UUID currentUserId(Authentication auth) {
        return UUID.fromString((String) auth.getPrincipal());
    }
}