package com.bank.banking.repository;

import com.bank.banking.model.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AuditLogRepo extends JpaRepository<AuditLog, Long> {
	List<AuditLog> findByUserIdOrderByCreatedAtDesc(UUID userId);

	List<AuditLog> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, String entityId);

	Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}