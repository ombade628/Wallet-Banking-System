# JavaBank Digital Banking System

JavaBank is a Spring Boot banking application with a responsive Thymeleaf interface, JWT cookie authentication, account management, idempotent transfers, and a double-entry ledger.

## Architecture

```text
Browser → Thymeleaf/REST controllers → services → JPA repositories → MySQL
                                      ↘ JWT security filter
```

## Stack

Java 21, Spring Boot 3.3, Spring Security, JPA/Hibernate, MySQL 8.4, Flyway, JWT (HS256), Thymeleaf, Bootstrap 5, JUnit 5 and Testcontainers.

## Run it

Prerequisites: Java 21+ and Docker Desktop.

```bash
docker compose up --build
```

Or start MySQL with `docker compose up -d mysql`, then run `mvn spring-boot:run`.
Open `http://localhost:8080`. The seeded administrator is `admin@javabank.local` with password `Admin@1234`.

## API

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/register` | Register and issue a cookie-backed JWT |
| `POST /api/auth/login` | Authenticate |
| `POST /api/accounts` | Create an account |
| `GET /api/accounts` | List the current user's accounts |
| `POST /api/transfers` | Execute an idempotent transfer |
| `GET /api/admin/stats` | Administrator statistics |

## Testing

Run `mvn test`. Testcontainers requires Docker to be running.

## Design decisions

Money is held as `BigDecimal(19,2)` to avoid floating-point loss. UUIDs prevent predictable identifiers. Each transfer produces paired debit and credit ledger entries; services validate that their signed total is zero. Account rows are locked in ascending UUID order to minimize deadlocks, and a unique request ID makes retries safe.

## Roadmap

Kafka event publishing, distributed tracing, audit exports, rate limiting, and multi-currency FX quoting.
