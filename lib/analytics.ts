export type AnalyticsEvent =
	| { name: 'add_to_cart'; productId: string; variantId: string; quantity: number }
	| { name: 'view_cart'; itemCount: number }
	| { name: 'begin_checkout'; itemCount: number }
	| { name: 'payment_state'; status: string }
	| { name: 'purchase'; orderId: string };

export type AnalyticsProvider = { track(event: AnalyticsEvent): void };

/** No-op by default; a real provider can be swapped in without touching UI code. */
export const analytics: AnalyticsProvider = {
	track(event: AnalyticsEvent) {
		if (process.env.NODE_ENV === 'development') {
			// eslint-disable-next-line no-console
			console.debug('[analytics]', event);
		}
	},
};
