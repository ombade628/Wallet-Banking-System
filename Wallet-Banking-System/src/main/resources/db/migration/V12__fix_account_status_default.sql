-- V1 seeded the default as 'REQUEST' but the Java enum is PENDING/ACTIVE/FROZEN/CLOSED
ALTER TABLE accounts
    ALTER COLUMN status SET DEFAULT 'PENDING';

UPDATE accounts
   SET status = 'PENDING'
 WHERE status = 'REQUEST'
    OR status NOT IN ('PENDING','ACTIVE','FROZEN','CLOSED');