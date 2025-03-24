import { api, APIError } from 'encore.dev/api'
import { secret } from 'encore.dev/config'
import { SQLDatabase } from 'encore.dev/storage/sqldb'
import log from 'encore.dev/log' // error, warn, info, debug, trace

// 'geocode' database is used to store the locations that are being geocoded.
const db = new SQLDatabase('geocode', { migrations: './migrations' })

//const apiKey = process.env.GOOGLE_MAPS_API_KEY
const apiKeyFn = secret('GOOGLE_MAPS_API_KEY') // encore way
if (apiKeyFn().length === 0) {
    log.warn('GOOGLE_MAPS_API_KEY is not set (length=0)')
} else {
    log.trace(`GOOGLE_MAPS_API_KEY found, length=${apiKeyFn().length}`)
}

interface LocationParams {
    location: string // the location to get the latitude and longitude for
}

export interface ReturnLatLon {
    location: string // "cleaned" original location string from request, name or street addresss
    full_address: string // complete address from Google Maps API
    latitude: number // latitude
    longitude: number // longitude
    status: 'found' | 'not_found' | 'unknown' // status of the request
}

// resolveLocation retrieves the latitude and longitude for a location, which can be a name or street address.
// TODO: consider supporting a new parameter to force API fetch
export const resolveLocation = api(
    { expose: true, auth: false, method: 'GET', path: '/location/:location' },
    async ({ location }: LocationParams): Promise<ReturnLatLon> => {
        // Validate the request
        const cleanedLocation = cleanLocation(location)
        if (cleanedLocation.length < 2) {
            throw APIError.invalidArgument(
                'location must be at least 2 characters'
            ) // HTTP 400, location too short
        }
        log.info(`Valid request, resolving location="${cleanedLocation}"`)

        // First try to get the location from the local cache, aka database
        let latlon = await getFromDB(cleanedLocation)
        if (latlon && latlon.status === 'found') {
            return latlon
        }
        if (latlon && latlon.status === 'not_found') {
            log.info(
                `location in DB as not_found, not fetching from API again, location="${cleanedLocation}"`
            )
            throw APIError.notFound('location not found') // HTTP 404, from cache
        }
        // If not found in DB, try to get the location from the API, storing result in DB.
        latlon = await getFromAPI(cleanedLocation)
        if (latlon) {
            await witeToDB(latlon)
            return latlon
        } else {
            await witeToDB({
                location: cleanedLocation,
                full_address: '',
                latitude: 0,
                longitude: 0,
                status: 'not_found',
            })
            log.info(
                `Not found from API nor DB, returning 404 not found for location="${cleanedLocation}"`
            )
        }
        throw APIError.notFound('location not found from API') // HTTP 404, from API
    }
)

const getFromAPI = async (location: string): Promise<ReturnLatLon | null> => {
    let data: any
    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${location}&key=${apiKeyFn()}`
        )
        data = await response.json()
        log.trace('Response from API', data)
    } catch (error) {
        log.error('Error fetching from API', error)
    }
    try {
        if (data.results.length > 0) {
            return {
                location,
                full_address: data.results[0].formatted_address,
                latitude: data.results[0].geometry.location.lat,
                longitude: data.results[0].geometry.location.lng,
                status: 'found',
            }
        } else {
            log.info('No results from API', { location: location, data: data })
        }
    } catch (error) {
        log.warn(
            'Could not process API response, format changed? ',
            data && data.results ? data.results : data
        )
    }
    return null
}
const getFromDB = async (location: string): Promise<ReturnLatLon | null> => {
    try {
        const row = await db.queryRow`
            SELECT * FROM locations WHERE location='${location}'
        `
        if (row) {
            return {
                location,
                full_address: row.full_address,
                latitude: row.latitude,
                longitude: row.longitude,
                status: 'found',
            }
        }
    } catch (error) {
        logError('Error getting from DB', error)
    }
    return null
}

const witeToDB = async (latlon: ReturnLatLon): Promise<boolean> => {
    try {
        const row = await db.exec`
            INSERT INTO locations (location, full_address, latitude, longitude) VALUES ('${latlon.location}', '${latlon.full_address}', ${latlon.latitude}, ${latlon.longitude})
        `
        if (row != null) {
            log.info('Added new location to DB Cache: ', latlon.location)
            return true
        }
    } catch (error) {
        logError('Error writing to DB', error)
    }
    return false
}

// cleanLocation cleans the location string to make sure we don't cache very similar location lookups.
// TODO: consider cleaning to prevent SQL injection attacks or similar.
const cleanLocation = (location: string): string => {
    const cleanedLocation = location.trim().toLowerCase()
    if (cleanedLocation != location) {
        log.info(
            `Parameter location="${location}" cleaned to "${cleanedLocation}"`
        )
    }
    return cleanedLocation
}

const logError = (msg: string, error: any) => {
    if (error instanceof Error) {
        log.error('1: ' + msg + ': ' + error.message)
        console.error('1: ' + msg + ': ' + error.message)
    } else if (typeof error === 'string') {
        log.error('2: ' + msg + ': ' + error)
        console.error('2: ' + msg + ': ' + error)
    } else {
        log.error('3: ' + msg + ': ' + error)
        console.error('3: ' + msg + ': ' + error)
    }
}
