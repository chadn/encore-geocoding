# Encore Geocoding API

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

## Encore Notes

This was my first time using Encore.ts and liked it overall. I did have trouble getting INSERT to work using db.exec approach, found the logging and troubleshooting abilities a bit thin. I switched to using knex ORM approach and that worked well - Knex had better logging and orm is a bit easier to grok.

Where encore really shines is their dashboards - both local and on the cloud. You can quickly create an api then use the dashboard to test and verify everything.

I recommend learning by doing a tutorial. I enjoyed the https://encore.dev/docs/ts/tutorials/rest-api because it was URL shortener with a REST API and PostgreSQL database - similar to my needs. During the tutorial I messed around with the db and found myself wishing there was more docs on how encore does some of their db magic.

## Google Maps API

This API requires a key from Google to use their Google Maps API Geocoding service.

-   API Key info https://developers.google.com/maps/documentation/geocoding/get-api-key
-   API info https://developers.google.com/maps/documentation/geocoding/requests-geocoding

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
