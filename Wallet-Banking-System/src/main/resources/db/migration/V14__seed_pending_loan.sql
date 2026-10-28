-- Give a customer an account first (replace with a real customer ID from your DB)
-- INSERT INTO accounts (id, account_number, owner_id, balance, currency, type, status)
-- VALUES ('uuid-here', '1234567890', 'customer-uuid-here', 0, 'INR', 'SAVINGS', 'ACTIVE');

-- Seed a pending loan
INSERT INTO loan (amount, interest_rate, tenure_months, status, outstanding_amount, emi_amount, applied_date, customer_id)
VALUES (500000.00, 10.50, 24, 'PENDING', 500000.00, 23163.00, CURRENT_DATE, 'customer-uuid-here');