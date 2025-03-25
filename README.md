# Encore Geocoding API

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Example of using [Encore.ts platform](https://github.com/encoredev/encore) to create an API to cache results from Gooogle Maps Geocoding API.

## Goal

The goal is to "build an API in a Typescript framework that consumes information from another free API" using Encore.ts or other framework.

The goal was met by using Google Maps Geocoding API to resolve addresses into latittude and longitude coordinates, and store the results in a cache to increase response time and limit the number of requests to Google's API. The cache is a PostgreSQL DB, chosen because Encore natively supports PostgreSQL databases.

## Example

```
curl 'https://staging-encore-geocoding-6azi.encr.app/location/sf,ca' -s| jq
{
  "full_address": "San Francisco, CA, USA",
  "longitude": -122.41942,
  "status": "found",
  "location": "sf,ca",
  "latitude": 37.77493
}

curl 'https://staging-encore-geocoding-6azi.encr.app/location/s' -s| jq
{
  "code": "invalid_argument",
  "message": "location must be at least 2 characters",
  "details": null
}

curl 'https://staging-encore-geocoding-6azi.encr.app/location/ss' -s| jq
{
  "code": "not_found",
  "message": "location not found from API",
  "details": null
}
```

## 🚀 Running the Application

### 🔧 Local Setup

If not already installed, first install

1. Node.js - Recommend using nvm with node, https://nodejs.org/en/download/
1. Docker - Recommend Docker Desktop, part of free Docker Personal Plan https://www.docker.com/pricing/
1. Encore.ts - https://encore.dev/docs/ts/install

Clone the repository, install dependencies:

```bash
# Create local clone of the repository, either of these will work:
gh repo clone chadn/encore-geocoding
git clone https://github.com/chadn/encore-geocoding.git

cd encore-geocoding
npm install
encore run
...
  Your API is running at:     http://127.0.0.1:4000
  Development Dashboard URL:  http://127.0.0.1:9400/encore-geocoding-xyzz

curl 'http://127.0.0.1:4000/location/sf,ca'
```

You can now run the app using either the dashboard or direct API calls.

Note that it will not resolve addresses unless GOOGLE_MAPS_API_KEY is set.

```
encore secret set --type prod,dev,preview,local GOOGLE_MAPS_API_KEY
```

### 🔑 Google Maps API

This API requires a key from Google to use their Google Maps API Geocoding service.
Read the following to get the value for GOOGLE_MAPS_API_KEY

-   Getting API Key https://developers.google.com/maps/documentation/geocoding/get-api-key
-   Using API info https://developers.google.com/maps/documentation/geocoding/requests-geocoding

## Encore Notes

This was my first time using Encore.ts and liked it overall. I did have trouble getting INSERT to work using db.exec approach, found the logging and troubleshooting abilities a bit thin. I switched to using knex ORM approach and that worked well - Knex had better logging and orm is a bit easier to grok.

Where encore really shines is their dashboards - both local and on the cloud. You can quickly create an api then use the dashboard to test and verify everything.

I recommend learning by doing a tutorial. I enjoyed the https://encore.dev/docs/ts/tutorials/rest-api because it was URL shortener with a REST API and PostgreSQL database - similar to my needs. During the tutorial I messed around with the db and found myself wishing there was more docs on how encore does some of their db magic.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
