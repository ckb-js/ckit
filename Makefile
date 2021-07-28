test: test-lib test-ckit-app

test-ckit-app:
	#yarn workspace ckit-app run test

test-lib:
	yarn jest

lint: lint-lib lint-app

lint-app:
	yarn workspace ckit-app run lint

lint-lib:
	yarn eslint packages/*/src/**/*.{ts,tsx} --format=pretty

build: build-lib build-app

build-lib:
	yarn lerna run --ignore ckit-app build

build-app:
	yarn workspace ckit-app run build

clean:
	yarn rimraf packages/*/dist
	yarn rimraf apps/*/dist
