package com.bank.banking.repository;

import com.bank.banking.model.entity.Loan;
import com.bank.banking.model.entity.LoanStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

//LoanRepo.java
public interface LoanRepo extends JpaRepository<Loan, Long> {
	List<Loan> findByCustomerIdOrderByAppliedDateDesc(UUID customerId);

	List<Loan> findByStatus(LoanStatus status);

	long countByStatus(LoanStatus status); // ✅ present
}