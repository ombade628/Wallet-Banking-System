CREATE TABLE loan (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    amount DECIMAL(19,2) NOT NULL,

    interest_rate DECIMAL(10,4),

    tenure_months INT,

    status VARCHAR(30),

    outstanding_amount DECIMAL(19,2),

    emi_amount DECIMAL(19,2),

    applied_date DATE,

    approved_date DATE,

    disbursed_date DATE,

    moratorium_active BOOLEAN NOT NULL DEFAULT FALSE,

    moratorium_months INT,

    moratorium_start_date DATE,

    moratorium_end_date DATE,

    customer_id CHAR(36)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci,

    CONSTRAINT fk_loan_customer
        FOREIGN KEY (customer_id)
        REFERENCES users(id),

    INDEX ix_loan_customer(customer_id)
) ENGINE=InnoDB
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;