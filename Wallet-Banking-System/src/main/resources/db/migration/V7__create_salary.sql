CREATE TABLE salary (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    employee_id CHAR(36)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci
        NOT NULL,

    amount DECIMAL(38,2) NOT NULL,

    effective_from DATE,

    effective_to DATE,

    CONSTRAINT fk_salary_employee
        FOREIGN KEY (employee_id)
        REFERENCES users(id),

    INDEX ix_salary_employee(employee_id)

) ENGINE=InnoDB
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;