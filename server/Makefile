
# Declare all targets as PHONY (not actual files)
.PHONY: dev test db-reset db-nuke db-migrate help

# Colors and formatting
BOLD := $(shell tput bold)
RED := $(shell tput setaf 1)
GREEN := $(shell tput setaf 2)
YELLOW := $(shell tput setaf 3)
RESET := $(shell tput sgr0)

# Default target (just typing 'make' runs this)
.DEFAULT_GOAL := help

# Help command that lists all available commands
help:
	@echo "$(BOLD)Available commands:$(RESET)"
	@echo "$(YELLOW)make dev$(RESET)        - Start development environment"
	@echo "$(YELLOW)make test$(RESET)       - Run tests"
	@echo "$(YELLOW)make db-reset$(RESET)   - Reset database completely"
	@echo "$(YELLOW)make db-nuke$(RESET)    - Drop all tables"
	@echo "$(YELLOW)make db-migrate$(RESET) - Run database migrations"

# Development environment
dev:
	@echo "$(GREEN)Starting development environment...$(RESET)"
	docker compose up -d
	@echo "$(GREEN)Starting server...$(RESET)"
	go run main.go

# Test command
test:
	@echo "$(GREEN)Running tests...$(RESET)"
	go test ./... -v

# Database commands
db-reset:
	@echo "$(RED)🔥 Resetting database...$(RESET)"
	docker compose down -v
	docker compose up -d
	@echo "$(YELLOW)⏳ Waiting for database to be ready...$(RESET)"
	sleep 3
	docker exec -it anky-postgres psql -U anky -d anky_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@echo "$(YELLOW)🔄 Running migrations...$(RESET)"
	migrate -database "postgresql://anky:development@localhost:5555/anky_db?sslmode=disable" -path database/migrations up
	@echo "$(GREEN)✅ Database reset complete!$(RESET)"

db-nuke:
	@echo "$(RED)💀 Nuking database...$(RESET)"
	docker exec -it anky-postgres psql -U anky -d anky_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@echo "$(GREEN)Database nuked!$(RESET)"

db-migrate:
	@echo "$(YELLOW)Running migrations...$(RESET)"
	migrate -database "postgresql://anky:development@localhost:5555/anky_db?sslmode=disable" -path database/migrations up
	@echo "$(GREEN)✅ Migrations complete!$(RESET)"

build:
	@go build -o bin/gobank

run: build
	@./bin/gobank

test:
	@go test -v ./...