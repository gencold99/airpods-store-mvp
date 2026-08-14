import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { CartProvider } from '@/lib/cart/CartProvider';
import CatalogGrid, { type CatalogCardView } from './CatalogGrid';

const priced: CatalogCardView = {
	id: 'first',
	slug: 'first',
	name: 'AirPods A',
	initials: 'A',
	tagline: 'Тестовая модель',
	category: 'AirPods',
	priceLabel: '200 ₽',
	priceOnRequest: false,
	inStock: true,
	purchasable: true,
	variantId: 'standard',
	highlights: [],
};

const onRequest: CatalogCardView = {
	...priced,
	id: 'second',
	slug: 'second',
	name: 'AirPods B',
	initials: 'B',
	priceLabel: 'Цена по запросу',
	priceOnRequest: true,
	purchasable: false,
};

function renderGrid(items: CatalogCardView[]) {
	return render(
		<CartProvider>
			<CatalogGrid items={items} />
		</CartProvider>,
	);
}

afterEach(() => {
	cleanup();
	window.localStorage.clear();
});

describe('CatalogGrid quick view', () => {
	it('opens a modal dialog, moves focus into it and returns focus on Escape', () => {
		renderGrid([priced]);

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		const trigger = screen.getByRole('button', { name: /Быстрый просмотр/ });
		trigger.focus();
		fireEvent.click(trigger);

		const dialog = screen.getByRole('dialog');
		expect(dialog).toHaveAttribute('aria-modal', 'true');
		// The product name is a heading on the card too, so scope the query to the dialog.
		expect(within(dialog).getByRole('heading', { name: 'AirPods A' })).toBeInTheDocument();
		expect(within(dialog).getByRole('button', { name: 'Закрыть' })).toHaveFocus();

		fireEvent.keyDown(dialog, { key: 'Escape' });

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(trigger).toHaveFocus();
	});

	it('closes on the close button as well', () => {
		renderGrid([priced]);

		fireEvent.click(screen.getByRole('button', { name: /Быстрый просмотр/ }));
		fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Закрыть' }));

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('offers a price request instead of add-to-cart when the price is unknown', () => {
		renderGrid([onRequest]);

		expect(screen.queryByRole('button', { name: /В корзину/ })).not.toBeInTheDocument();
		expect(screen.getByRole('link', { name: /Уточнить цену/ })).toHaveAttribute(
			'href',
			'/products/second#price-request',
		);
	});
});
