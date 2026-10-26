CREATE TABLE users (
    id CHAR(36)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci
        NOT NULL PRIMARY KEY,

    email VARCHAR(255) NOT NULL UNIQUE,

    password_hash VARCHAR(255) NOT NULL,

    full_name VARCHAR(255) NOT NULL,

    enabled BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;


CREATE TABLE user_role (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    user_id CHAR(36)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci
        NOT NULL,

    role VARCHAR(30) NOT NULL,

    CONSTRAINT fk_user_role_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT uk_user_role
        UNIQUE (user_id, role),

    INDEX ix_user_role_user(user_id)
) ENGINE=InnoDB
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;


CREATE TABLE accounts (
    id CHAR(36)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci
        NOT NULL PRIMARY KEY,

    account_number VARCHAR(20) NOT NULL UNIQUE,

    owner_id CHAR(36)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci
        NOT NULL,

    balance DECIMAL(19,2) NOT NULL DEFAULT 0,

    currency CHAR(3) NOT NULL DEFAULT 'INR',

    type VARCHAR(20) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'REQUEST',

    version BIGINT NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_accounts_user
        FOREIGN KEY (owner_id)
        REFERENCES users(id),

    CONSTRAINT ck_account_balance
        CHECK (balance >= 0),

    INDEX ix_accounts_owner(owner_id)
) ENGINE=InnoDB
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;


CREATE TABLE transactions (
    id CHAR(36)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci
        NOT NULL PRIMARY KEY,

    request_id VARCHAR(64) NOT NULL UNIQUE,

    from_account_id CHAR(36)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci
        NOT NULL,

    to_account_id CHAR(36)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci
        NOT NULL,

    amount DECIMAL(19,2) NOT NULL,

    currency CHAR(3) NOT NULL,

    status VARCHAR(20) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tx_from
        FOREIGN KEY (from_account_id)
        REFERENCES accounts(id),

    CONSTRAINT fk_tx_to
        FOREIGN KEY (to_account_id)
        REFERENCES accounts(id),

    CONSTRAINT ck_tx_amount
        CHECK (amount > 0),

    INDEX ix_tx_from(from_account_id),
    INDEX ix_tx_to(to_account_id)
) ENGINE=InnoDB
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;


CREATE TABLE ledger_entries (
    id CHAR(36)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci
        NOT NULL PRIMARY KEY,

    transaction_id CHAR(36)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci
        NOT NULL,

    account_id CHAR(36)
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci
        NOT NULL,

    direction VARCHAR(6) NOT NULL,

    amount DECIMAL(19,2) NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ledger_tx
        FOREIGN KEY (transaction_id)
        REFERENCES transactions(id),

    CONSTRAINT fk_ledger_account
        FOREIGN KEY (account_id)
        REFERENCES accounts(id),

    CONSTRAINT ck_ledger_direction
        CHECK (direction IN ('DEBIT','CREDIT')),

    CONSTRAINT ck_ledger_amount
        CHECK (amount > 0),

    INDEX ix_ledger_tx(transaction_id),
    INDEX ix_ledger_account(account_id)
) ENGINE=InnoDB
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

