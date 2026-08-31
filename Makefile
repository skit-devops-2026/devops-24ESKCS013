# Makefile for Student Hub — static HTML/CSS/JS project
# The CI pipeline calls these targets. Do not rename them.

install:
	@echo "No dependencies to install (static HTML/CSS/JS project)"

test:
	@bash scripts/test.sh

build:
	@echo "No build step required (static site)"

run:
	@echo "Serving project locally..."
	@npx serve . -l 3000

.PHONY: install test build run
