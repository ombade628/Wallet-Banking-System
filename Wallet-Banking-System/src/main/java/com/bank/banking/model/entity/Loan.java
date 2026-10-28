package com.bank.banking.model.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;



@Entity

public class Loan {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id ;
	
	private BigDecimal amount ; 
	private BigDecimal interestRate ; 
	private Integer tenureMonths ;
	
	@Enumerated(EnumType.STRING) 
	private LoanStatus status; 
	
	private BigDecimal outstandingAmount ;
	private BigDecimal emiAmount ;	

	private LocalDate appliedDate ; 
	private LocalDate approvedDate ;
	private LocalDate disbursedDate ; 
	
	
	private boolean moratoriumActive;
	private Integer moratoriumMonths;
	private LocalDate moratoriumStartDate;
	private LocalDate moratoriumEndDate;
	
	@OneToMany(mappedBy = "loan", cascade = jakarta
			.persistence
			.CascadeType
			.ALL,
	           orphanRemoval = true)
	private List<LoanEmi> emis = new ArrayList<>();
	
	
	@ManyToOne
	@JoinColumn(name = "customer_id")
	private User customer;
	
	
//	Constructors
	public Loan() {
		
	}
	
	public Loan(Long id, BigDecimal amount, BigDecimal interestRate, Integer tenureMonths, LoanStatus status,
			LocalDate appliedDate) {
		super();
		this.id = id;
		this.amount = amount;
		this.interestRate = interestRate;
		this.tenureMonths = tenureMonths;
		this.status = status;
		this.appliedDate = appliedDate;
//		this.approvedDate = approvedDate;
	}
	
	
	
//	Getters and Setters
	
	public BigDecimal getEmiAmount() {
		return emiAmount;
	}


	public void setEmiAmount(BigDecimal emiAmount) {
		this.emiAmount = emiAmount;
	}


	public BigDecimal getOutstandingAmount() {
		return outstandingAmount;
	}


	public void setOutstandingAmount(BigDecimal outstandingAmount) {
		this.outstandingAmount = outstandingAmount;
	}


	public LocalDate getDisbursedDate() {
		return disbursedDate;
	}


	public void setDisbursedDate(LocalDate disbursedDate) {
		this.disbursedDate = disbursedDate;
	}

	
	


	
	public Long getId() {
		return id;
	}
	
	
	public void setId(Long id) {
		this.id = id;
	}
	
	
	public BigDecimal getAmount() {
		return amount;
	}
	
	
	public void setAmount(BigDecimal amount) {
		this.amount = amount;
	}
	
	public BigDecimal getInterestRate() {
		
		return interestRate;
	}
	
	
	public void setInterestRate(BigDecimal interestRate) {
		this.interestRate = interestRate;
	}
	
	public Integer getTenureMonths() {
		return tenureMonths;
	}
	
	public void setTenureMonths(Integer tenureMonths) {
		this.tenureMonths = tenureMonths;
	}
	
	
	public LoanStatus getStatus() {
		return status;
	}
	
	public void setStatus(LoanStatus status) {
		this.status = status;
	}
	
	
	public LocalDate getAppliedDate() {
		return appliedDate;
	}
	
	
	public void setAppliedDate(LocalDate appliedDate) {
		this.appliedDate = appliedDate;
	}
	
	
	public LocalDate getApprovedDate() {
		return approvedDate;
	}
	
	
	public void setApprovedDate(LocalDate approvedDate) {
		this.approvedDate = approvedDate;
	}

	public boolean isMoratoriumActive() {
		return moratoriumActive;
	}

	public void setMoratoriumActive(boolean moratoriumActive) {
		this.moratoriumActive = moratoriumActive;
	}

	public Integer getMoratoriumMonths() {
		return moratoriumMonths;
	}

	public void setMoratoriumMonths(Integer moratoriumMonths) {
		this.moratoriumMonths = moratoriumMonths;
	}

	public LocalDate getMoratoriumStartDate() {
		return moratoriumStartDate;
	}

	public void setMoratoriumStartDate(LocalDate moratoriumStartDate) {
		this.moratoriumStartDate = moratoriumStartDate;
	}

	public LocalDate getMoratoriumEndDate() {
		return moratoriumEndDate;
	}

	public void setMoratoriumEndDate(LocalDate moratoriumEndDate) {
		this.moratoriumEndDate = moratoriumEndDate;
	} 
	
	public User getCustomer() {
	    return customer;
	}

	public void setCustomer(User customer) {
	    this.customer = customer;
	}
	
}
