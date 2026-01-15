.PHONY: up up-dev down logs

up:
	docker-compose up --build -d

up-dev:
	docker-compose -f docker-compose.dev.yml up --build

down:
	docker-compose down

logs:
	docker-compose logs -f

status:
	docker-compose ps

health:
	curl -f http://localhost:3000/health || echo "❌ App not healthy"
