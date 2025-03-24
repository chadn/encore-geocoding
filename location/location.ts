import { api, APIError } from 'encore.dev/api'
import { secret } from 'encore.dev/config'
import { SQLDatabase } from 'encore.dev/storage/sqldb'
import log from 'encore.dev/log' // error, warn, info, debug, trace
import knex from 'knex'

// 'geocode' database is used to store the locations that are being geocoded.
const GeocodeDB = new SQLDatabase('geocode', { migrations: './migrations' })
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
    status: 'found' | 'not_found' // status of the request
}

// Retrieves the latitude and longitude for a location, which can be a place name or street address.
export const resolveLocation = api(
    { expose: true, auth: false, method: 'GET', path: '/location/:location' },
    // TODO: consider supporting a new parameter to force API fetch
    async ({ location }: LocationParams): Promise<ReturnLatLon> => {
        // Validate the request and clean the location string
        const cleanedLocation = cleanLocation(location)

        // First try to get the location from the local cache, aka database
        let latlon = await getOrmFromDB(cleanedLocation)
        if (latlon) {
            if (latlon.status === 'found') {
                return latlon
            } else if (latlon.status === 'not_found') {
                log.info(
                    `location in DB as not_found, not fetching from API again, location="${cleanedLocation}"`
                )
                throw APIError.notFound('location not found') // HTTP 404, from cache
            } else {
                log.warn(
                    `Unexpected status=${latlon.status} in DB for location="${cleanedLocation}"`
                )
            }
        }
        // If not found in DB, try to get the location from the API, storing result in DB.
        latlon = await getFromAPI(cleanedLocation)
        //latlon = null
        if (latlon) {
            await witeOrmToDB(latlon)
            return latlon
        } else {
            // If not found in DB or API, store a not_found status in DB so we don't fetch from API again
            await witeOrmToDB({
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

// Deletes from cache the given location, which can be a place name or street address.
export const deleteLocation = api(
    {
        expose: true,
        auth: false,
        method: 'DELETE',
        path: '/location/:location',
    },
    async ({ location }: LocationParams): Promise<void> => {
        const cleanedLocation = cleanLocation(location)
        if (await deleteOrmDB(cleanedLocation)) {
            return // TODO: return 204 No Content instead of 200
        }
        log.info(
            `deleteLocation not deleting, Location "${cleanedLocation}" not found in DB`
        )
        throw APIError.notFound('location not found') // HTTP 404, from DB
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
    return parseAPI(location, data)
}

export const parseAPI = (location: string, data: any): ReturnLatLon | null => {
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

export const getOrmFromDB = async (
    location: string
): Promise<ReturnLatLon | null> => {
    // https://knexjs.org/guide/query-builder.html#select
    const query = Locations().where('location', location).first()
    log.trace(`getOrmFromDB Query: ${query.toString()};`)
    return await query.then(async (r) => {
        if (r) {
            log.trace(`getOrmFromDB Query result: ${JSON.stringify(r)}`)
            log.info(`Location "${location}" found in DB`)
            return r
        }
        log.info(`Location "${location}" not found in DB`)
        return null
    })
}
export const witeOrmToDB = async (latlon: ReturnLatLon): Promise<boolean> => {
    try {
        const sql = Locations().insert(latlon)
        log.trace(`witeOrmToDB SQL: ${sql.toString()};`)
        const resp = await sql
        log.info('Location written orm to DB', resp)
        return true
    } catch (error) {
        logError('Error writing orm to DB', error)
    }
    return false
}

export const deleteOrmDB = async (
    latlon: ReturnLatLon | string
): Promise<boolean> => {
    const location = typeof latlon === 'string' ? latlon : latlon.location
    const sql = Locations().where('location', location).delete()
    log.trace(`deleteOrmDB SQL: ${sql.toString()}`)
    const resp = await sql
    log.info(`Location "${location}" was${resp ? '' : ' NOT'} deleted from DB`)
    return resp ? true : false
}

// witeToDB replaced by witeOrmToDB because witeToDB had the following error .
// db error: ERROR: could not determine data type of parameter $1
const witeToDB = async (latlon: ReturnLatLon): Promise<boolean> => {
    try {
        const row = await GeocodeDB.exec`
            INSERT INTO locations (location, full_address, latitude, longitude, status) 
            VALUES ('${latlon.location}', '${latlon.full_address}', ${latlon.latitude}, ${latlon.longitude}, '${latlon.status}')
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
export const cleanLocation = (location: string): string => {
    const cleanedLocation = location.trim().toLowerCase()
    if (cleanedLocation != location) {
        log.info(
            `Parameter location="${location}" cleaned to "${cleanedLocation}"`
        )
    }
    if (cleanedLocation.length < 2) {
        throw APIError.invalidArgument('location must be at least 2 characters') // HTTP 400, location too short
    }
    log.info(`Valid request location="${cleanedLocation}"`)
    return cleanedLocation
}

// comparing encore's logging to console logging.  Remove eventually.
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

const orm = knex({
    client: 'pg',
    // debug: true, // uncomment to see the SQL queries in the console (not encore logs)
    connection: GeocodeDB.connectionString,
})
const Locations = () => orm<ReturnLatLon>('locations')
