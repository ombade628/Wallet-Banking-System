package com.bank.banking.exception;

public class DuplicateTransactionException extends RuntimeException{

	public DuplicateTransactionException(String requestId) {
		super("Transaction already processed" + requestId);
	}
	
}
