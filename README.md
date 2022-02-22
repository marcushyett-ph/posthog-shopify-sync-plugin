# Shopify Plugin

Get customer and order data from Shopify into PostHog.

This plugin will:

* Associate your Shopify customers with PostHog users
* Create a PostHog user from a Shopify customer if it doesn't exist
* Create events for every new order
* In case while fetching orders if there is an error (promise timeout/poor connectivity), the next run of runEveryMinute() would try to read state from where it stopped the previous time.


## Installation
* If you are developing locally, go to `Advanced` tab in `Plugins` and either provide the URL of this repository or clone this repository and provide the absolute path of the folder created.
* The plugin has not been accepted yet to the official plugin repository


## Configuration

### Shopify Store
Get the store name from your Shopify Account and set it while initializing the plugin to fetch order events for it.

### Shopify Access Token
* Create an app on the admin page of your Shopify Account.
* Generate `Admin API access token` in the `API Credentials` tab of your newly created app.
* We will use this token to call the admin APIs to fetch orders.