async function setupPlugin({ config, global, storage }) {
    if (!config.shopifyStore) {
        throw new Error("Please set the 'shopifyStore' config value")
    }

    if (!config.shopifyAccessToken) {
        throw new Error("Please set the 'shopifyAccessToken' config value")
    }

    global.defaultHeaders = {
        headers: {
            'X-Shopify-Access-Token': `${config.shopifyAccessToken}`,
        },
    }

    const authResponse = await fetchWithRetry(
        `https://${config.shopifyStore}.myshopify.com/admin/api/2022-01/orders.json?limit=1`,
        global.defaultHeaders
    )

    if (!statusOk(authResponse)) {
        throw new Error('Unable to connect to Shopify. Please make sure your Access Token is correct.')
    }
}

async function fetchAllOrders(shopifyStore, defaultHeaders) {
    let orders = []

    let orderApiUrl = `https://${shopifyStore}.myshopify.com/admin/api/2022-01/orders.json?limit=1`

    let hasMoreOrders = true

    while (hasMoreOrders) {
        const orderResponse = await fetchWithRetry(orderApiUrl, defaultHeaders)

        orderJson = await orderResponse.json()
        orderApiUrl = getNextPageUrl(orderResponse.headers)

        if (orderApiUrl === null) {
            hasMoreOrders = false
        }

        const newOrders = orderJson.orders
        orders = [...orders, ...newOrders]
    }

    return orders
}

async function runEveryMinute({ cache, storage, global, config }) {
    const orders = await fetchAllOrders(config.shopifyStore, global.defaultHeaders)

    for (const order of orders) {
        const orderRecordExists = await storage.get(`shopify-order-${order.id}`)
        const customerEmail = order.customer?.email
        const customerRecordExists = await storage.get(`shopify-customer-${customerEmail}`)

        if (!orderRecordExists) {
            await storage.set(`shopify-order-${order.id}`, true)
        }

        if (!customerRecordExists) {
            await storage.set(`shopify-customer-${customerEmail}`, true)
        }

        const orderToSave = {
            order_number: order.order_number,
            currency: order.currency,
            transaction_amount: order.current_total_price,
            // status: order.status,
            order_status_url: order.order_status_url,
            financial_status: order.financial_status,
            created_at: order.created_at,
            // description: order.description
        }

        if (customerEmail !== undefined) {
            posthog.capture(customerRecordExists ? 'Updated Shopify Customer' : 'Created Shopify Customer', {
                distinct_id: order.customer.email,
                ...order.customer,
            })
        }
        posthog.capture(orderRecordExists ? 'Updated Shopify Order' : 'Created Shopify Order', {
            distinct_id: customerEmail || order.id,
            ...order,
            ...orderToSave,
        })
    }
}

function getNextPageUrl(headers) {
    if (headers.has('link')) {
        let linkHeader = headers.get('link')
        const paginationInfo = linkHeader.split(',')

        for (i = 0; i < paginationInfo.length; i++) {
            let paginatedLinkBody = paginationInfo[i].split(';')

            if (paginatedLinkBody[1].trim() === 'rel="next"') {
                orderApiUrl = paginatedLinkBody[0].substring(
                    paginatedLinkBody[0].indexOf('<') + 1,
                    paginatedLinkBody[0].lastIndexOf('>')
                )
                return orderApiUrl
            }
        }
    }

    return null
}

async function fetchWithRetry(url, options = {}, method = 'GET', isRetry = false) {
    try {
        const res = await fetch(url, { method: method, ...options })
        return res
    } catch {
        if (isRetry) {
            throw new Error(`${method} request to ${url} failed.`)
        }
        const res = await fetchWithRetry(url, options, (method = method), (isRetry = true))
        return res
    }
}

function statusOk(res) {
    return String(res.status)[0] === '2'
}
