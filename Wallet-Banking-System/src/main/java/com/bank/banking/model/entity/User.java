package com.bank.banking.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
        name = "users",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_users_email", columnNames = "email")
        },
        indexes = {
                @Index(name = "ix_users_email", columnList = "email")
        })
public class User {

    @Id
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(columnDefinition = "CHAR(36)")
    private UUID id = UUID.randomUUID();

    @Column(nullable = false, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 255)
    private String fullName;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<UserRole> roles = new ArrayList<>();

    @Column(nullable = false)
    private boolean enabled = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    // =========================================================
    // CONSTRUCTORS
    // =========================================================
    public User() {
    }

    public User(String email, String passwordHash, String fullName) {
        this.email = email == null ? null : email.toLowerCase();
        this.passwordHash = passwordHash;
        this.fullName = fullName;
    }

    // =========================================================
    // ROLE HELPERS
    // =========================================================
    public void addRole(Role role) {
        if (role == null) return;
        boolean exists = roles.stream().anyMatch(r -> r.getRole() == role);
        if (exists) return;
        UserRole ur = new UserRole();
        ur.setUser(this);
        ur.setRole(role);
        roles.add(ur);
    }

    public void removeRole(Role role) {
        if (role == null) return;
        roles.removeIf(r -> r.getRole() == role);
    }

    public void clearRoles() {
        roles.clear();
    }

    public boolean hasRole(Role role) {
        if (role == null) return false;
        return roles.stream().anyMatch(r -> r.getRole() == role);
    }

    public boolean hasAnyRole(Role... candidates) {
        if (candidates == null) return false;
        for (Role r : candidates) {
            if (hasRole(r)) return true;
        }
        return false;
    }

    public List<Role> roleNames() {
        return roles.stream().map(UserRole::getRole).toList();
    }

    // =========================================================
    // ENABLED HELPERS
    // =========================================================
    public void enable() {
        this.enabled = true;
    }

    public void disable() {
        this.enabled = false;
    }

    public void toggleEnabled() {
        this.enabled = !this.enabled;
    }

    // =========================================================
    // SETTERS
    // =========================================================
    public void setId(UUID id) {
        this.id = id;
    }

    public void setEmail(String email) {
        this.email = email == null ? null : email.toLowerCase();
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

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public void setRoles(List<UserRole> roles) {
        this.roles = roles == null ? new ArrayList<>() : roles;
    }

    // =========================================================
    // GETTERS
    // =========================================================
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

    public List<UserRole> getRoles() {
        return roles;
    }

    // =========================================================
    // equals / hashCode — stable on id only
    // =========================================================
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User other)) return false;
        return id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    // =========================================================
    // toString — never leak passwordHash
    // =========================================================
    @Override
    public String toString() {
        return "User{" +
                "id=" + id +
                ", email='" + email + '\'' +
                ", fullName='" + fullName + '\'' +
                ", enabled=" + enabled +
                ", roles=" + roleNames() +
                '}';
    }
}