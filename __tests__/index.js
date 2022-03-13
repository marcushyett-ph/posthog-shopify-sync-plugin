const { getMeta, resetMeta } = require('@posthog/plugin-scaffold/test/utils.js')
const { setupPlugin, getNextPageUrl, fetchAllOrders } = require('../index')
const defaultResponse = require('./res.json')

global.fetch = jest.fn(async () => ({
    json: async () => defaultResponse,
    status: 200,
}))

global.posthog = {}

global.posthog['capture'] = jest.fn(async (eventName, props) => ({
    json: async () => ({ event: eventName, ...props }),
}))

beforeEach(() => {
    fetch.mockClear()

    resetMeta({
        config: {
            shopifyStore: 'posthogStore',
            shopifyAccessToken: 'supersecretaccesstoken',
        },
    })
})

// setupPlugin test
test('setupPlugin with a token', async () => {
    expect(fetch).toHaveBeenCalledTimes(0)

    await setupPlugin(getMeta())

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('https://posthogStore.myshopify.com/admin/api/2022-01/orders.json?limit=1', {
        headers: { 'X-Shopify-Access-Token': 'supersecretaccesstoken' },
        method: 'GET',
    })
})

test('test fetchAllOrders with only page response', async () => {
    const meta = getMeta()

    await setupPlugin(meta)
    await fetchAllOrders(meta.config.shopifyStore, meta.global.headers, null, meta.cache, meta.storage)

    expect(fetch).toHaveBeenCalledTimes(2)

    expect(fetch).toHaveBeenCalledWith('https://posthogStore.myshopify.com/admin/api/2022-01/orders.json?limit=250', {
        method: 'GET',
    })

    expect(posthog.capture).toHaveBeenCalledTimes(2)
})

test('test fetchAllOrders with 2 page response', async () => {
    let headers = new Map()
    headers.set(
        'link',
        '<https://posthogStore.myshopify.com/admin/api/2022-01/orders.json?limit=10&page_info=eyJsYXN0X2lkIjo0MzkwNTQ4OTMwNzE3LCJsYXN0X3ZhbHVlIjoiMjAyMi0wMi0yMSAxMjo1MzoyMy4wMDY3MTkiLCJkaXJlY3Rpb24iOiJuZXh0In0>; rel="next"'
    )

    const firstResponse = {
        json: async () => defaultResponse,
        status: 200,
        headers: headers,
    }

    const secondResponse = {
        json: async () => defaultResponse,
        status: 200,
    }

    fetch.mockReturnValueOnce(firstResponse).mockReturnValueOnce(secondResponse)

    const meta = getMeta()

    await fetchAllOrders(meta.config.shopifyStore, meta.global.headers, null, meta.cache, meta.storage)

    expect(fetch).toHaveBeenCalledTimes(2)

    expect(fetch).toHaveBeenCalledWith('https://posthogStore.myshopify.com/admin/api/2022-01/orders.json?limit=250', {
        method: 'GET',
    })

    expect(fetch).toHaveBeenCalledWith(
        'https://posthogStore.myshopify.com/admin/api/2022-01/orders.json?limit=10&page_info=eyJsYXN0X2lkIjo0MzkwNTQ4OTMwNzE3LCJsYXN0X3ZhbHVlIjoiMjAyMi0wMi0yMSAxMjo1MzoyMy4wMDY3MTkiLCJkaXJlY3Rpb24iOiJuZXh0In0',
        {
            method: 'GET',
        }
    )

    expect(posthog.capture).toHaveBeenCalledTimes(5)
})

test('test fetchAllOrders with error response', async () => {
    const meta = getMeta()

    await setupPlugin(meta)
    let headers = new Map()
    headers.set(
        'link',
        '<https://posthogStore.myshopify.com/admin/api/2022-01/orders.json?limit=10&page_info=eyJsYXN0X2lkIjo0MzkwNTQ4OTMwNzE3LCJsYXN0X3ZhbHVlIjoiMjAyMi0wMi0yMSAxMjo1MzoyMy4wMDY3MTkiLCJkaXJlY3Rpb24iOiJuZXh0In0>; rel="next"'
    )

    fetch.mockImplementation(() => {
        throw new Error()
    })

    try {
        await fetchAllOrders(meta.config.shopifyStore, meta.global.headers, null, meta.cache, meta.storage)
    } catch (e) {}

    expect(fetch).toHaveBeenCalledTimes(3)
    expect(fetch).toHaveBeenCalledWith('https://posthogStore.myshopify.com/admin/api/2022-01/orders.json?limit=250', {
        method: 'GET',
    })
    expect(await meta.storage.get('current-url')).toBe(
        'https://posthogStore.myshopify.com/admin/api/2022-01/orders.json?limit=250'
    )
})

// getNextPageUrl tests
test('getNextPageUrl with header that has link attribute', () => {
    let headers = new Map()
    headers.set(
        'link',
        '<https://***.myshopify.com/admin/api/2022-01/orders.json?limit=10&page_info=eyJsYXN0X2lkIjo0MzkwNTQ4OTMwNzE3LCJsYXN0X3ZhbHVlIjoiMjAyMi0wMi0yMSAxMjo1MzoyMy4wMDY3MTkiLCJkaXJlY3Rpb24iOiJuZXh0In0>; rel="next"'
    )
    const nextPageUrl = getNextPageUrl(headers)
    expect(nextPageUrl).toEqual(
        'https://***.myshopify.com/admin/api/2022-01/orders.json?limit=10&page_info=eyJsYXN0X2lkIjo0MzkwNTQ4OTMwNzE3LCJsYXN0X3ZhbHVlIjoiMjAyMi0wMi0yMSAxMjo1MzoyMy4wMDY3MTkiLCJkaXJlY3Rpb24iOiJuZXh0In0'
    )
})

test('getNextPageUrl with header that has no link attribute', () => {
    let headers = new Map()
    const nextPageUrl = getNextPageUrl(headers)
    expect(nextPageUrl).toEqual(null)
})

test('getNextPageUrl with header that is null', () => {
    let headers
    const nextPageUrl = getNextPageUrl(headers)
    expect(nextPageUrl).toEqual(null)
})
