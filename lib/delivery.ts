import { businessConfig } from './config';
import { money, type Money } from './money';

export type DeliveryOption = {
	id: string;
	label: string;
	price: Money;
	eta: string | null;
	note: string;
};

export type DeliveryProvider = {
	id: string;
	options: DeliveryOption[];
	find(id: string): DeliveryOption | null;
};

const options: DeliveryOption[] = [
	{
		id: 'ufa-courier',
		label: businessConfig.delivery.ufa.label,
		price: money(businessConfig.delivery.ufa.price),
		eta: businessConfig.delivery.ufa.eta,
		note: businessConfig.delivery.note,
	},
	{
		id: 'russia-shipping',
		label: businessConfig.delivery.russia.label,
		price: money(businessConfig.delivery.russia.price),
		eta: businessConfig.delivery.russia.eta,
		note: businessConfig.delivery.note,
	},
];

export const deliveryProvider: DeliveryProvider = {
	id: 'mock-delivery',
	options,
	find(id: string) {
		return options.find((option) => option.id === id) ?? null;
	},
};
