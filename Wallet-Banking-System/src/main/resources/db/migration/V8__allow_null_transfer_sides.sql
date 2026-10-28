ALTER TABLE transactions
    MODIFY from_account_id CHAR(36)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci
        NULL;

ALTER TABLE transactions
    MODIFY to_account_id CHAR(36)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci
        NULL;