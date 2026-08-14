import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { parseCatalogQuery } from '@/lib/catalog/query';
import CatalogControls from './CatalogControls';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push, replace: push, refresh: vi.fn(), prefetch: vi.fn() }),
}));

const categories = ['AirPods', 'Наушники'];

beforeEach(() => {
	push.mockClear();
});

afterEach(() => {
	cleanup();
});

describe('CatalogControls', () => {
	it('applies a filter immediately when the panel is inline', () => {
		render(<CatalogControls query={parseCatalogQuery()} categories={categories} resultCount={3} />);

		fireEvent.click(screen.getByLabelText('Только в наличии'));

		expect(push).toHaveBeenCalledWith('/shop?availability=available', { scroll: false });
	});

	it('keeps drawer edits local until they are applied', () => {
		render(<CatalogControls query={parseCatalogQuery()} categories={categories} resultCount={3} />);

		fireEvent.click(screen.getByRole('button', { name: /Фильтры/ }));
		expect(screen.getByRole('dialog')).toBeInTheDocument();

		fireEvent.click(screen.getByLabelText('AirPods'));
		expect(push).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole('button', { name: 'Показать результаты' }));

		expect(push).toHaveBeenCalledWith('/shop?category=AirPods', { scroll: false });
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('closes the drawer on Escape without applying anything', () => {
		render(<CatalogControls query={parseCatalogQuery()} categories={categories} resultCount={3} />);

		fireEvent.click(screen.getByRole('button', { name: /Фильтры/ }));
		fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		expect(push).not.toHaveBeenCalled();
	});

	it('shows every active filter as a chip that removes only itself', () => {
		const query = parseCatalogQuery({ q: 'pro', category: ['AirPods', 'Наушники'], availability: 'available' });
		render(<CatalogControls query={query} categories={categories} resultCount={1} />);

		expect(screen.getByRole('link', { name: /Поиск: pro/ })).toHaveAttribute(
			'href',
			'/shop?category=AirPods&category=%D0%9D%D0%B0%D1%83%D1%88%D0%BD%D0%B8%D0%BA%D0%B8&availability=available',
		);
		expect(screen.getByRole('link', { name: /Только в наличии/ })).toHaveAttribute(
			'href',
			'/shop?q=pro&category=AirPods&category=%D0%9D%D0%B0%D1%83%D1%88%D0%BD%D0%B8%D0%BA%D0%B8',
		);
	});
});
