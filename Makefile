.PHONY: dev backend frontend load-data test lint

dev: load-data
	@echo "Starting backend and frontend..."
	@trap 'kill %1 %2 2>/dev/null' EXIT; \
	  uv run uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload & \
	  (cd frontend && npm run dev -- --host 0.0.0.0) & \
	  wait

backend:
	uv run uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

frontend:
	cd frontend && npm run dev -- --host 0.0.0.0

load-data:
	uv run python scripts/load_data.py

test:
	uv run pytest
	cd frontend && npm run test

lint:
	uv run ruff check .
	uv run mypy backend scripts tests
	cd frontend && npm run lint
