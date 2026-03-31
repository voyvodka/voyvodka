IMAGE_NAME ?= portfolio-backend
ENV_FILE ?= .env
HOST_PORT ?= 5555
CONTAINER_PORT ?= 8080
DATA_VOLUME ?= portfolio_data

.PHONY: tidy build run dev

tidy:
	docker run --rm -v "$(CURDIR):/src" -w /src golang:1.25 go mod tidy

build:
	docker build -t $(IMAGE_NAME) .

run:
	docker run --rm -p $(HOST_PORT):$(CONTAINER_PORT) -v $(DATA_VOLUME):/app/data --env-file $(ENV_FILE) $(IMAGE_NAME)

dev:
	@docker ps -q --filter "publish=$(HOST_PORT)" | xargs -r docker rm -f 2>/dev/null || true
	docker run --rm --name $(IMAGE_NAME)-dev -p $(HOST_PORT):$(CONTAINER_PORT) -v "$(CURDIR):/src" -w /src --env-file $(ENV_FILE) golang:1.25 go run ./cmd/api
