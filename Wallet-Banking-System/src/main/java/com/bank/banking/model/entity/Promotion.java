package com.bank.banking.model.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.*;

@Entity
public class Promotion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User employee;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role previousRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role newRole;

    private BigDecimal previousSalary;

    private BigDecimal newSalary;

    private LocalDate promotionDate;

    @ManyToOne
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    private String reason;

    public Promotion() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getEmployee() {
        return employee;
    }

    public void setEmployee(User employee) {
        this.employee = employee;
    }

    public Role getPreviousRole() {
        return previousRole;
    }

    public void setPreviousRole(Role previousRole) {
        this.previousRole = previousRole;
    }

    public Role getNewRole() {
        return newRole;
    }

    public void setNewRole(Role newRole) {
        this.newRole = newRole;
    }

    public BigDecimal getPreviousSalary() {
        return previousSalary;
    }

    public void setPreviousSalary(BigDecimal previousSalary) {
        this.previousSalary = previousSalary;
    }

    public BigDecimal getNewSalary() {
        return newSalary;
    }

    public void setNewSalary(BigDecimal newSalary) {
        this.newSalary = newSalary;
    }

    public LocalDate getPromotionDate() {
        return promotionDate;
    }

    public void setPromotionDate(LocalDate promotionDate) {
        this.promotionDate = promotionDate;
    }

    public User getApprovedBy() {
        return approvedBy;
    }

    public void setApprovedBy(User approvedBy) {
        this.approvedBy = approvedBy;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}