# Collector Server

## Overview
The API accepts alive pings on `[GET] /` and collects readings on `[POST] /readings`. A reading can stem from sensors of type _focus_, _history_ (see [extension](#) for details) and is periodically transmitted in batches. A collection of transmitted readings might look like this:

Focus data:
```json
{
    "clientId": "123e4567-e89b-12d3-a456-426655440000",
    "sensor": "focus",
    "readings": [
        {
            "tab": 1,
            "url": "chrome://extensions/",
            "start": 1571737026731,
            "end": 1571737036626
        },
        {
            "tab": 10,
            "url": "http://example.com",
            "start": 1571737026731,
            "end": 1571737036626
        }
    ]
}
```

History data:
```json
{
    "clientId": "123e4567-e89b-12d3-a456-426655440000",
    "sensor": "history",
    "readings": [
	{
	    "id": "15676",
	    "lastVisitTime": 1571816627911.428,
	    "title": "example - Google Search",
	    "typedCount": 0,
	    "url": "https://www.google.com/search?q=example",
	    "visitCount":3
	},
	{
	    "id":"15675",
	    "lastVisitTime":1571816107784.005,
	    "title":"Example Domain",
	    "typedCount":0,
	    "url":"https://example.com",
	    "visitCount":1
	}
    ]
}
```

## Requirements
- python/virtualenv
- local postgres
- heroku

## Getting started
- Clone this repository
- Fetch dependencies: `make`
- Create local test database: `make db-create-dev`
- Reset local database: `make db-reset-dev`
- Run local server: `make run`
- Reset production database: `make db-reset-prod`
- Deploy: `make deploy` (deploys the server directory to `heroku:master`)
