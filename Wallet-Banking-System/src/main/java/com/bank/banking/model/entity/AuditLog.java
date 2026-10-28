package com.bank.banking.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_log")
public class AuditLog {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "user_id", nullable = false, columnDefinition = "CHAR(36)")
	private UUID userId;

	@Column(nullable = false, length = 50)
	private String action;

	@Column(name = "entity_type", nullable = false, length = 50)
	private String entityType;

	@Column(name = "entity_id", nullable = false, length = 100)
	private String entityId;

	@Column(columnDefinition = "TEXT")
	private String details;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt = Instant.now();

	public AuditLog() {
	}

	public AuditLog(UUID userId, String action, String entityType, String entityId, String details) {
		this.userId = userId;
		this.action = action;
		this.entityType = entityType;
		this.entityId = entityId;
		this.details = details;
	}

	public Long getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public String getAction() {
		return action;
	}

	public String getEntityType() {
		return entityType;
	}

	public String getEntityId() {
		return entityId;
	}

	public String getDetails() {
		return details;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}