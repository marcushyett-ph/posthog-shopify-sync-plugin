# Shopify Plugin

Get customer and order data from Shopify into PostHog.

This plugin will:

* Associate your Shopify customers with PostHog users
* Create a PostHog user from a Shopify customer if it doesn't exist
* Create events for every new order
* In case while fetching orders if there is an error (promise timeout/poor connectivity), the next run of runEveryMinute() would try to read state from where it stopped the previous time.