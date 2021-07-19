test: test-lib test-ckit-app

test-ckit-app:
	#yarn workspace ckit-app run test

test-lib:
	yarn jest

lint: lint-lib lint-app

lint-app: build-lib
	yarn workspace ckit-app run lint

lint-lib:
	yarn eslint packages/*/src/**/*.{ts,tsx} --format=pretty

build: build-lib build-app

build-lib:
	yarn workspace ckit run build

build-app:
	yarn workspace ckit-app run build

clean:
	rimraf packages/*/dist
	rimraf apps/*/dist
