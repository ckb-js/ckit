test: test-lib test-ckit-app

test-ckit-app:
	#yarn workspace ckit-app run test

test-lib:
	DEBUG=ckit,ckit-* yarn jest --verbose false

lint: lint-lib lint-app
fix-lint: fix-lint-lib fix-lint-app

lint-fix:
	yarn eslint packages/*/src/**/*.{ts,tsx} --fix
	yarn workspace ckit-app run lint --fix

lint-app:
	yarn workspace ckit-app run lint

fix-lint-app:
	yarn workspace ckit-app run lint --fix

lint-lib:
	yarn eslint packages/*/src/**/*.{ts,tsx} --format=pretty

fix-lint-lib:
	yarn eslint packages/*/src/**/*.{ts,tsx} --format=pretty --fix

build: build-lib build-app

build-lib:
	yarn lerna run --ignore ckit-app build

build-app:
	yarn workspace ckit-app run build

clean:
	yarn rimraf packages/*/dist
	yarn rimraf apps/*/dist

start-docker:
	cd docker && docker-compose up -d

stop-docker:
	cd docker && docker-compose down

github-ci: build-lib lint stop-docker start-docker
	test -d tmp && mv tmp tmp-$$(date '+%Y%m%d%H%M%S') || :
	make test

watch-lib: build-lib
	yarn lerna exec --parallel yarn run watch
