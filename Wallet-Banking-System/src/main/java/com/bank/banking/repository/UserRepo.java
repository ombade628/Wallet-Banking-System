package com.bank.banking.repository;

import com.bank.banking.model.entity.Role;
import com.bank.banking.model.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepo extends JpaRepository<User, UUID> {

    // =========================
    // BASIC USER OPERATIONS
    // =========================

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);


    // =========================
    // ROLE OPERATIONS
    // =========================
    
    List<User> findByEnabled(boolean enabled);
    
    
    // Get all users of a particular role
    @Query("SELECT DISTINCT u FROM User u JOIN u.roles ur WHERE ur.role = :role")
    List<User> findByRole(@Param("role") Role role);

    @Query("SELECT DISTINCT u FROM User u JOIN u.roles ur " +
           "WHERE ur.role = :role AND u.enabled = :enabled")
    List<User> findByRoleAndEnabled(
            @Param("role") Role role,
            @Param("enabled") boolean enabled
    );

    @Query("SELECT COUNT(DISTINCT u) FROM User u JOIN u.roles ur WHERE ur.role = :role")
    long countByRole(@Param("role") Role role);

    @Query("SELECT DISTINCT u FROM User u JOIN u.roles ur " +
           "WHERE u.email = :email AND ur.role = :role")
    Optional<User> findByEmailAndRole(
            @Param("email") String email,
            @Param("role") Role role
    );

    @Query("SELECT CASE WHEN COUNT(u) > 0 THEN true ELSE false END " +
           "FROM User u JOIN u.roles ur " +
           "WHERE u.email = :email AND ur.role = :role")
    boolean existsByEmailAndRole(
            @Param("email") String email,
            @Param("role") Role role
    );

    @Query("SELECT DISTINCT u FROM User u JOIN u.roles ur " +
           "WHERE ur.role = :role " +
           "AND LOWER(u.fullName) LIKE LOWER(CONCAT('%', :fullName, '%'))")
    List<User> findByRoleAndFullNameContainingIgnoreCase(
            @Param("role") Role role,
            @Param("fullName") String fullName
    ); 
}