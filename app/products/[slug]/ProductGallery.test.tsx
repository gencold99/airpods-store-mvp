import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ProductGallery from './ProductGallery';

const slots = [
	{ id: 'main', label: 'Основное фото', src: null },
	{ id: 'detail', label: 'Деталь', src: null },
];

afterEach(() => {
	cleanup();
});

describe('ProductGallery', () => {
	it('switches the main stage when another slot is chosen', () => {
		render(<ProductGallery name="AirPods 4" initials="4" slots={slots} />);

		const thumbs = screen.getAllByRole('button');
		expect(thumbs).toHaveLength(2);
		expect(thumbs[0]).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByText('Основное фото', { selector: 'figcaption' })).toBeInTheDocument();

		fireEvent.click(thumbs[1]);

		expect(thumbs[1]).toHaveAttribute('aria-pressed', 'true');
		expect(thumbs[0]).toHaveAttribute('aria-pressed', 'false');
		expect(screen.getByText('Деталь', { selector: 'figcaption' })).toBeInTheDocument();
	});

	it('renders a single stage without a rail when there is only one slot', () => {
		render(<ProductGallery name="AirPods 4" initials="4" slots={[]} />);

		expect(screen.queryAllByRole('button')).toHaveLength(0);
		expect(screen.getByRole('img', { name: /слот изображения/ })).toBeInTheDocument();
	});
});
