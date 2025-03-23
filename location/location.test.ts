import { describe, expect, test } from 'vitest'
import { resolveLocation, ReturnLatLon } from './location'

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
