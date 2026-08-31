# Every team fills in the commands for their own stack.
# The CI pipeline calls these targets, so the names must not change.
#
# Examples:
#   Node    install: npm ci          test: npm test        build: npm run build
#   Python  install: pip install -r requirements.txt
#                                    test: pytest          build: echo "no build step"
#   Java    install: ./mvnw -B dependency:go-offline

install:
	@echo "No dependencies to install (static HTML/CSS/JS project)"

test:
	@echo "No automated tests yet (add your tests here for M3)"

build:
	@echo "No build step required (static site)"

run:
	@echo "Open index.html in your browser, or serve with:"
	@echo "  npx serve . -l 3000"

.PHONY: install test build run
