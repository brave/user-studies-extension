init:
	- pip install --upgrade pip
	- pip install -r requirements.txt

.PHONY: db-create-dev
db-create-dev:
	createdb collector_test

.PHONY: db-reset-dev
db-reset-dev:
	psql "postgresql://localhost/collector_test" < db/down.sql
	psql "postgresql://localhost/collector_test" < db/up.sql

.PHONY: deploy
deploy:
	cd ..; git subtree split --prefix=collector-server -b deploy-branch
	git push -f heroku deploy-branch:master
	git branch -D deploy-branch

.PHONY: run
run:
	heroku local web