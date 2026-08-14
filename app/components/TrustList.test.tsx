import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { TrustSignal } from '@/lib/config';
import { businessConfig } from '@/lib/config';
import TrustList from './TrustList';

const signals: TrustSignal[] = [
	{ id: 'confirmed', title: 'Оригинальные устройства', text: 'Подмены модели не будет.', status: 'confirmed' },
	{ id: 'pending', title: 'Доставка', text: 'Стоимость подтверждает менеджер.', status: 'pending' },
];

function pendingMarkers(): HTMLElement[] {
	return Array.from(document.querySelectorAll<HTMLElement>('.trust-pending'));
}

afterEach(() => {
	cleanup();
});

describe('TrustList', () => {
	it('renders a confirmed promise without any hedging', () => {
		render(<TrustList signals={[signals[0]]} />);

		expect(screen.getByText('Оригинальные устройства')).toBeInTheDocument();
		expect(pendingMarkers()).toHaveLength(0);
	});

	// Главное правило: неподтверждённое условие не должно выглядеть как обещание.
	it('marks a pending promise as not yet confirmed', () => {
		render(<TrustList signals={[signals[1]]} />);

		const markers = pendingMarkers();
		expect(markers).toHaveLength(1);
		expect(markers[0]).toHaveTextContent('Уточняется');
		expect(markers[0]).toHaveTextContent('условия ещё не подтверждены');
	});

	it('marks every pending signal of the real configuration', () => {
		render(<TrustList signals={businessConfig.trust} label="Почему нам можно доверять" />);

		const expected = businessConfig.trust.filter((signal) => signal.status === 'pending').length;
		expect(pendingMarkers()).toHaveLength(expected);
		expect(screen.getByRole('list', { name: 'Почему нам можно доверять' })).toBeInTheDocument();
	});

	it('renders nothing rather than an empty box', () => {
		const { container } = render(<TrustList signals={[]} />);

		expect(container).toBeEmptyDOMElement();
	});
});
