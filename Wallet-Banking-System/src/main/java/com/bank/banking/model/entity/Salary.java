package com.bank.banking.model.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.persistence.*;

@Entity
public class Salary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "employee_id", nullable = false)
    private User employee;

    @Column(nullable = false)
    private BigDecimal amount;

    private LocalDate effectiveFrom;

    private LocalDate effectiveTo;

    public Salary() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) 
    {
        this.id = id;
    }

    public User getEmployee() 
    {
        return employee;
    }

    public void setEmployee(User employee) 
    {
        this.employee = employee;
    }

    public BigDecimal getAmount() 
    {
        return amount;
    }

    public void setAmount(BigDecimal amount) 
    {
        this.amount = amount;
    }

    public LocalDate getEffectiveFrom() 
    {
        return effectiveFrom;
    }

    public void setEffectiveFrom(LocalDate effectiveFrom) 
    {
        this.effectiveFrom = effectiveFrom;
    }

    public LocalDate getEffectiveTo() 
    {
        return effectiveTo;
    }

    public void setEffectiveTo(LocalDate effectiveTo) 
    {
        this.effectiveTo = effectiveTo;
    }
}