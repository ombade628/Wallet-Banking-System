CREATE TABLE loan_emi (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    loan_id BIGINT NOT NULL,

    emi_number INT NOT NULL,

    due_date DATE,

    principal_amount DECIMAL(19,2),

    interest_amount DECIMAL(19,2),

    emi_amount DECIMAL(19,2),

    paid_amount DECIMAL(19,2),

    status VARCHAR(30),

    paid_date DATE,

    CONSTRAINT fk_loan_emi_loan
        FOREIGN KEY (loan_id)
        REFERENCES loan(id),

    INDEX ix_loan_emi_loan(loan_id)

) ENGINE=InnoDB
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;