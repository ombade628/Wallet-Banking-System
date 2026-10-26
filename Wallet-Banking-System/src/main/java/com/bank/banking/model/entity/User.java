package com.bank.banking.model.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "users")
public class User {

	@Id
	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(columnDefinition = "CHAR(36)")
	private UUID id = UUID.randomUUID();
	
	@Column(nullable = false, unique = true)
	private String email;

	@Column(name = "password_hash", nullable = false)
	private String passwordHash;

	@Column(name = "full_name", nullable = false)
	private String fullName;

	@OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
	private List<UserRole> roles = new ArrayList<>();
	
	
	@Column(nullable = false)
	private boolean enabled = true;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt = Instant.now();

	public User() {
	}

	public User(String email, String passwordHash, String fullName) {
	    this.email = email.toLowerCase();
	    this.passwordHash = passwordHash;
	    this.fullName = fullName; 
	}
	public void setId(UUID id) {
		this.id = id;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public void setPasswordHash(String passwordHash) {
		this.passwordHash = passwordHash;
	}

	public void setFullName(String fullName) {
		this.fullName = fullName;
	}
 
	public void setCreatedAt(Instant createdAt) {
		this.createdAt = createdAt;
	}

	public UUID getId() {
		return id;
	}

	public String getEmail() {
		return email;
	}

	public String getPasswordHash() {
		return passwordHash;
	}

	public String getFullName() {
		return fullName;
	}
 

	public boolean isEnabled() {
		return enabled;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public void setEnabled(boolean enabled) {
		this.enabled = enabled;
	}
	public List<UserRole> getRoles(){
		return roles;
	}
 
}
