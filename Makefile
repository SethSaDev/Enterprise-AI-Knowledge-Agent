.PHONY: help dev build test clean deploy

help:
	@echo "Available commands:"
	@echo "  make dev      - Start development environment"
	@echo "  make build    - Build all applications"
	@echo "  make test     - Run all tests"
	@echo "  make clean    - Clean build artifacts"
	@echo "  make deploy   - Deploy to production"
	@echo "  make docker-up   - Start Docker services"
	@echo "  make docker-down - Stop Docker services"

dev:
	npm run dev

build:
	npm run build

test:
	npm run test

clean:
	npm run clean
	rm -rf dist build .next

deploy:
	./scripts/deploy.sh

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

db-migrate:
	npm run db:migrate

db-seed:
	npm run db:seed

lint:
	npm run lint

format:
	npm run format