CREATE TABLE promotion (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    user_id CHAR(36)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci
        NOT NULL,

    previous_role VARCHAR(255) NOT NULL,

    new_role VARCHAR(255) NOT NULL,

    previous_salary DECIMAL(38,2),

    new_salary DECIMAL(38,2),

    promotion_date DATE,

    approved_by CHAR(36)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci,

    reason VARCHAR(255),

    CONSTRAINT fk_promotion_employee
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT fk_promotion_approved_by
        FOREIGN KEY (approved_by)
        REFERENCES users(id),

    INDEX ix_promotion_user(user_id),
    INDEX ix_promotion_approved_by(approved_by)

) ENGINE=InnoDB
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
