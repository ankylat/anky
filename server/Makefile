# Declare all targets as PHONY (not actual files)
.PHONY: dev test db-reset db-nuke db-migrate help build run

# Colors and formatting
BOLD := $(shell tput bold)
RED := $(shell tput setaf 1)
GREEN := $(shell tput setaf 2)
YELLOW := $(shell tput setaf 3)
RESET := $(shell tput sgr0)

# Default target
.DEFAULT_GOAL := help

# Help command that lists all available commands
help:
	@echo "$(BOLD)Available commands:$(RESET)"
	@echo "$(YELLOW)make dev$(RESET)        - Start development environment"
	@echo "$(YELLOW)make test$(RESET)       - Run tests"
	@echo "$(YELLOW)make db-reset$(RESET)   - Reset database completely"
	@echo "$(YELLOW)make db-nuke$(RESET)    - Drop all tables"
	@echo "$(YELLOW)make db-migrate$(RESET) - Run database migrations"
	@echo "$(YELLOW)make build$(RESET)      - Build the application"
	@echo "$(YELLOW)make run$(RESET)        - Build and run the application"

# Development environment
dev:
	@echo "$(GREEN)Starting development environment...$(RESET)"
	docker compose up -d
	@echo "$(GREEN)Starting server...$(RESET)"
	go run *.go

# Test command (single definition)
test:
	@echo "$(GREEN)Running tests...$(RESET)"
	@go test -v ./...

# Database commands
db-reset:
	@echo "$(RED)🔥 Resetting database...$(RESET)"
	docker compose down -v
	docker compose up -d
	@echo "$(YELLOW)⏳ Waiting for database to be ready...$(RESET)"
	sleep 3
	docker exec -it anky-postgres psql -U anky -d anky_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@echo "$(YELLOW)🔄 Running migrations...$(RESET)"
	migrate -database "postgresql://anky:development@localhost:5555/anky_db?sslmode=disable" -path storage/migrations up
	@echo "$(GREEN)✅ Database reset complete!$(RESET)"

db-nuke:
	@echo "$(RED)💀 Nuking database...$(RESET)"
	docker exec -it anky-postgres psql -U anky -d anky_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@echo "$(GREEN)Database nuked!$(RESET)"

db-migrate:
	@echo "$(YELLOW)Running migrations...$(RESET)"
	migrate -database "postgresql://anky:development@localhost:5555/anky_db?sslmode=disable" -path storage/migrations up
	@echo "$(GREEN)✅ Migrations complete!$(RESET)"

build:
	@echo "$(GREEN)Building application...$(RESET)"
	@go build -o bin/server *.go

run: build
	@echo "$(GREEN)Running server...$(RESET)"
	@./bin/server

db-check:
	@echo "$(YELLOW)Checking database connection...$(RESET)"
	@docker exec -it anky-postgres pg_isready -U anky -d anky_db || (echo "$(RED)Database is not ready!$(RESET)" && exit 1)
	@echo "$(GREEN)Database is connected!$(RESET)"

db-setup: db-check
	@echo "$(YELLOW)Setting up database...$(RESET)"
	@migrate -database "postgresql://anky:development@localhost:5555/anky_db?sslmode=disable" -path storage/migrations force 0
	@migrate -database "postgresql://anky:development@localhost:5555/anky_db?sslmode=disable" -path storage/migrations up
	@echo "$(GREEN)Database setup complete!$(RESET)"

db-migrate-create:
	@read -p "Enter migration name: " name; \
	migrate create -ext sql -dir storage/migrations -seq $$name

db-rollback:
	@echo "$(YELLOW)Rolling back last migration...$(RESET)"
	@migrate -database "${DATABASE_URL}" -path storage/migrations down 1
	@echo "$(GREEN)Rollback complete!$(RESET)"
