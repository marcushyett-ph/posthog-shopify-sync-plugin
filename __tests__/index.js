const { getMeta, resetMeta, createCache } = require('@posthog/plugin-scaffold/test/utils.js')
const { setupPlugin, runEveryMinute, getNextPageUrl } = require('../index')
const defaultRes = require('./res.json')

global.fetch = jest.fn(async () => ({
    json: async () => defaultRes,
    status: 200
}))

global.posthog = {}

global.posthog['capture'] = jest.fn(async (eventName, props) => ({
    json: async () => ({ event: eventName, ...props })
}))

beforeEach(() => {
    fetch.mockClear()

    resetMeta({
        config: {
            shopifyStore: 'posthogStore',
            shopifyAccessToken: 'supersecretaccesstoken'
        }
    })
})

// setupPlugin test
test('setupPlugin with a token', async () => {
    expect(fetch).toHaveBeenCalledTimes(0)

    await setupPlugin(getMeta())

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('https://posthogStore.myshopify.com/admin/api/2022-01/orders.json?limit=1', {
        headers: { 'X-Shopify-Access-Token': 'supersecretaccesstoken' }, "method": "GET",
    })
})



// test('', async () => {
//     await runEveryMinute(getMeta())
//     expect(fetch).toHaveBeenCalledTimes(1)
//     expect(fetch).toHaveBeenCalledWith(
//         'https://cdn.syndication.twimg.com/widgets/followbutton/info.json?screen_names=posthoghq',
//         {
//             method: 'GET'
//         }
//     )

//     expect(posthog.capture).toHaveBeenCalledTimes(1)
//     expect(posthog.capture).toHaveBeenCalledWith('twitter_followers', { follower_count: 1402 })
// })


// getNextPageUrl tests
test('getNextPageUrl with header that has link attribute', () => {
    let headers = new Map()
    headers.set('link', '<https://***.myshopify.com/admin/api/2022-01/orders.json?limit=10&page_info=eyJsYXN0X2lkIjo0MzkwNTQ4OTMwNzE3LCJsYXN0X3ZhbHVlIjoiMjAyMi0wMi0yMSAxMjo1MzoyMy4wMDY3MTkiLCJkaXJlY3Rpb24iOiJuZXh0In0>; rel="next"')
    nextPageUrl = getNextPageUrl(headers)
    expect(nextPageUrl).toEqual('https://***.myshopify.com/admin/api/2022-01/orders.json?limit=10&page_info=eyJsYXN0X2lkIjo0MzkwNTQ4OTMwNzE3LCJsYXN0X3ZhbHVlIjoiMjAyMi0wMi0yMSAxMjo1MzoyMy4wMDY3MTkiLCJkaXJlY3Rpb24iOiJuZXh0In0')
})

test('getNextPageUrl with header that has no link attribute', () => {
    let headers = new Map()
    nextPageUrl = getNextPageUrl(headers)
    expect(nextPageUrl).toEqual(null)
})

test('getNextPageUrl with header that is null', () => {
    let headers
    nextPageUrl = getNextPageUrl(headers)
    expect(nextPageUrl).toEqual(null)
})
