package com.bank.banking.service;

import com.bank.banking.model.dto.DepositRequest;
import com.bank.banking.model.dto.TransactionResponse;
import com.bank.banking.model.dto.TransferRequest;
import com.bank.banking.model.entity.Account;
import com.bank.banking.model.entity.Role;
import com.bank.banking.model.entity.User;
import com.bank.banking.model.entity.UserRole;
import com.bank.banking.repository.UserRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.bank.banking.repository.AccountRepo;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepo users;
    private final AccountRepo accounts;

    public UserService(UserRepo users, AccountRepo accountRepo) {
        this.users = users;
        this.accounts = accountRepo;
    }

    @Transactional(readOnly = true)
    public User get(UUID id) {
        return users.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    @Transactional(readOnly = true)
    public User getByEmail(String email) {
        return users.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    @Transactional(readOnly = true)
    public List<User> getAll() {
        return users.findAll();
    }

    @Transactional(readOnly = true)
    public List<User> getByRole(Role role) {
        return users.findByRole(role);
    }

    @Transactional(readOnly = true)
    public List<User> getByRoleAndEnabled(Role role, boolean enabled) {
        return users.findByRoleAndEnabled(role, enabled);
    }

    @Transactional
    public void enable(UUID id) {
        User user = get(id);
        user.setEnabled(true);
    }

    @Transactional
    public void disable(UUID id) {
        User user = get(id);
        user.setEnabled(false);
    }

    @Transactional
    public void changeRole(UUID id, Role role) {

        User user = get(id);

        boolean alreadyHasRole = user.getRoles().stream()
                .anyMatch(userRole -> userRole.getRole() == role);

        if (alreadyHasRole) {
            throw new IllegalArgumentException("User already has this role");
        }

        UserRole userRole = new UserRole();
        userRole.setUser(user);
        userRole.setRole(role);

        user.getRoles().add(userRole);
    }
	public String getDashboard() {
		// TODO Auto-generated method stub
		return null;
	}

	public String addAccount() {
		// TODO Auto-generated method stub
		return null;
	}

	public String approveLoan(Long LoaId) {
		// TODO Auto-generated method stub
		return "";
	}

	public String getTransactions() {
		// TODO Auto-generated method stub
		return null;
	}

	@Transactional
	public String transfer(TransferRequest request) {

	    if (request.fromAccountId().equals(request.toAccountId())) {
	        throw new IllegalArgumentException(
	                "Cannot transfer money to the same account");
	    }

	    Account fromAccount = accounts
	            .findById(request.fromAccountId())
	            .orElseThrow(() ->
	                    new RuntimeException("Sender account not found"));

	    Account toAccount = accounts
	            .findById(request.toAccountId())
	            .orElseThrow(() ->
	                    new RuntimeException("Receiver account not found"));

	    

	    fromAccount.debit(request.amount());
	    toAccount.credit(request.amount());

	    accounts.save(fromAccount);
	    accounts.save(toAccount);

	    return "Transfer successful";
	}
	 
	 
	@Transactional
	public TransactionResponse deposit(DepositRequest req) {
		// TODO Auto-generated method stub
		
		Account acc = accounts.findByAccountNumber(req.accountNumber())
				.orElseThrow(() ->  
				new IllegalArgumentException("Account number not found")) ; 
		
		acc.credit(req.amount());
		
		 
		 return  new TransactionResponse(UUID.randomUUID().toString(),
				 acc.getAccountNumber(),
				 req.amount(),
				 acc.getBalance(),
				 "Deposit",
				 Instant.now()
				 ); 
	}

	public String withdraw() {
		// TODO Auto-generated method stub
		return "";
	}

	public String requestLoan( ) {
		// TODO Auto-generated method stub 
 		return "";
 		
 		
	}

	public String manageWorkers() {
		// TODO Auto-generated method stub 
 		return "";
	}

	public String salary( ) { 
 		return "";
	}

	public String promotion( ) {
		// TODO Auto-generated method stub 
 		return "";
	}
}