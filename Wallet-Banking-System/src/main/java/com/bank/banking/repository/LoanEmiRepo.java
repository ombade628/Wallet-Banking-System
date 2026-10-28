package com.bank.banking.repository;

import com.bank.banking.model.entity.LoanEmi;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LoanEmiRepo extends JpaRepository<LoanEmi, Long> {
	List<LoanEmi> findByLoanIdOrderByInstallmentNumber(Long loanId);
}