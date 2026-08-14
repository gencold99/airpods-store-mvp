import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { money } from '@/lib/money';
import type { Product } from '@/lib/domain';
import PriceRequestForm from './PriceRequestForm';

const product: Product = {
	id: 'airpods-pro',
	slug: 'airpods-pro',
	name: 'AirPods Pro',
	tagline: 'Тестовая модель',
	category: 'AirPods Pro',
	image: null,
	gallery: [],
	highlights: [],
	price: money(null),
	oldPrice: money(null),
	availability: 'available',
	variants: [{ id: 'standard', label: 'Стандартная версия', sku: 'SKU', price: money(null), available: true }],
	specs: {},
};

afterEach(() => {
	cleanup();
});

describe('PriceRequestForm', () => {
	it('refuses to submit without a way to answer', () => {
		render(<PriceRequestForm product={product} />);

		fireEvent.click(screen.getByRole('button', { name: 'Отправить заявку' }));

		expect(screen.getByText('Укажите телефон или email, чтобы менеджер мог ответить.')).toBeInTheDocument();
	});

	it('confirms the request without promising a delivery it cannot make yet', async () => {
		render(<PriceRequestForm product={product} />);

		fireEvent.change(screen.getByLabelText('Телефон или email'), { target: { value: '+7 999 000 00 00' } });
		fireEvent.click(screen.getByRole('button', { name: 'Отправить заявку' }));

		await waitFor(() => expect(screen.getByText(/Заявка BF-Q-/)).toBeInTheDocument());
		expect(screen.getByText(/данные не покидают устройство/)).toBeInTheDocument();
	});
});
