import { describe, expect, test, vi, beforeEach } from 'vitest'
import {
    resolveLocation,
    ReturnLatLon,
    parseAPI,
    getOrmFromDB,
    witeOrmToDB,
    deleteOrmDB,
    cleanLocation,
} from './location'

// Mock data
const mockLocation = '7th West, Oakland, CA'
const mockGoogleResponse = {
    results: [
        {
            formatted_address: '7th West, Oakland, CA 94607, USA',
            geometry: {
                location: {
                    lat: 37.77493,
                    lng: -122.251686,
                },
            },
        },
    ],
}

const mockReturnLatLon: ReturnLatLon = {
    location: mockLocation,
    full_address: '7th West, Oakland, CA 94607, USA',
    latitude: 37.77493,
    longitude: -122.251686,
    status: 'found',
}

describe('parseAPI', () => {
    test('should parse valid Google Maps API response', () => {
        const result = parseAPI(mockLocation, mockGoogleResponse)
        expect(result).toEqual(mockReturnLatLon)
    })

    test('should return null for empty results', () => {
        const result = parseAPI(mockLocation, { results: [] })
        expect(result).toBeNull()
    })

    test('should return null for invalid response format', () => {
        const result = parseAPI(mockLocation, { invalid: 'format' })
        expect(result).toBeNull()
    })
})

describe('cleanLocation', () => {
    test('should clean and lowercase location string', () => {
        const result = cleanLocation('  7TH West, Oakland, CA  ')
        expect(result).toBe('7th west, oakland, ca')
    })

    test('should throw error for short location', () => {
        expect(() => cleanLocation('a')).toThrow(
            'location must be at least 2 characters'
        )
    })

    test('should handle already clean location', () => {
        const clean = 'clean location'
        const result = cleanLocation(clean)
        expect(result).toBe(clean)
    })
})

describe('Database Operations', () => {
    beforeEach(async () => {
        // Clean up any existing test data
        await deleteOrmDB(mockLocation)
    })

    describe('witeOrmToDB', () => {
        test('should write location to database', async () => {
            const result = await witeOrmToDB(mockReturnLatLon)
            expect(result).toBe(true)
        })
    })

    describe('getOrmFromDB', () => {
        test('should retrieve written location', async () => {
            // First write the data
            await witeOrmToDB(mockReturnLatLon)

            // Then retrieve it
            const result = await getOrmFromDB(mockLocation)
            expect(result).toEqual(mockReturnLatLon)
        })

        test('should return null for non-existent location', async () => {
            const result = await getOrmFromDB('non-existent-location')
            expect(result).toBeNull()
        })
    })

    describe('deleteOrmDB', () => {
        test('should delete location by string', async () => {
            // First write the data
            await witeOrmToDB(mockReturnLatLon)

            // Then delete it
            const result = await deleteOrmDB(mockLocation)
            expect(result).toBe(true)

            // Verify it's gone
            const check = await getOrmFromDB(mockLocation)
            expect(check).toBeNull()
        })

        test('should delete location by ReturnLatLon object', async () => {
            // First write the data
            await witeOrmToDB(mockReturnLatLon)

            // Then delete it using the full object
            const result = await deleteOrmDB(mockReturnLatLon)
            expect(result).toBe(true)

            // Verify it's gone
            const check = await getOrmFromDB(mockLocation)
            expect(check).toBeNull()
        })

        test('should return false for non-existent location', async () => {
            const result = await deleteOrmDB('non-existent-location')
            expect(result).toBe(false)
        })
    })
})

describe('resolveLocation', () => {
    test('todo', async () => {
        expect('not_found').toBe('not_found')
    })
    /*
    test('location too short', async () => {
        const resp = await resolveLocation({ location: 'a' })
        expect(resp.status).toBe('not_found')
    })
    test('resolving a location should return a latitude and longitude', async () => {
        const resp: ReturnLatLon = await resolveLocation({
            location: '7th West, Oakland, CA',
        })
        expect(resp.latitude).toBe(37.774929)
        expect(resp.longitude).toBe(-122.251685)
    })
    */
})
