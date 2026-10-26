INSERT INTO users (
    id,
    email,
    password_hash,
    full_name,
    enabled
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'badeom628@javabank.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'JavaBank Administrator',
    TRUE
);

INSERT INTO user_role (
    user_id,
    role
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'BANK'
);