.PHONY: preview check ready build preview-dist docker-build docker-up docker-down

preview:
	python3 scripts/serve.py

check:
	python3 scripts/check.py

ready:
	python3 scripts/check.py --strict-contact

build: check
	python3 scripts/build.py
	python3 scripts/check.py --root dist

preview-dist: build
	python3 scripts/serve.py --directory dist

docker-build:
	docker build --tag kamkhaya-construction:local .

docker-up:
	docker compose up --build --detach

docker-down:
	docker compose down
