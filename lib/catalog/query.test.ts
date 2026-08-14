import { describe, expect, it } from 'vitest';
import { applyCatalogQuery, isCatalogQueryActive, listCategories, parseCatalogQuery } from './query';
import { money } from '../money';
import type { Product } from '../domain';

function makeProduct(input: {
	id: string;
	name: string;
	category: string;
	price: number | null;
	available?: boolean;
	tagline?: string;
}): Product {
	const available = input.available !== false;
	return {
		id: input.id,
		slug: input.id,
		name: input.name,
		tagline: input.tagline ?? '',
		category: input.category,
		image: null,
		price: money(input.price),
		oldPrice: money(null),
		availability: available ? 'available' : 'unavailable',
		variants: [
			{ id: 'standard', label: 'Стандартная версия', sku: `SKU-${input.id}`, price: money(input.price), available },
		],
		specs: {},
	};
}

const cheap = makeProduct({ id: 'cheap', name: 'Buds Lite', category: 'AirPods', price: 100000, tagline: 'Лёгкий звук' });
const mid = makeProduct({ id: 'mid', name: 'Buds Pro', category: 'AirPods Pro', price: 250000 });
const expensive = makeProduct({ id: 'expensive', name: 'Buds Max', category: 'Наушники', price: 500000, available: false });
const unpriced = makeProduct({ id: 'unpriced', name: 'Buds Future', category: 'AirPods', price: null });

const catalog = [cheap, mid, expensive, unpriced];

describe('parseCatalogQuery', () => {
	it('falls back to safe defaults', () => {
		expect(parseCatalogQuery()).toEqual({ search: '', categories: [], sort: 'recommended', availability: 'all' });
	});

	it('rejects values that are not part of the whitelist', () => {
		expect(parseCatalogQuery({ sort: 'price-desc' }).sort).toBe('price-desc');
		expect(parseCatalogQuery({ sort: '../../etc/passwd' }).sort).toBe('recommended');
		expect(parseCatalogQuery({ availability: 'maybe' }).availability).toBe('all');
	});

	it('trims the search term, caps its length and de-duplicates categories', () => {
		expect(parseCatalogQuery({ q: '   pro   ' }).search).toBe('pro');
		expect(parseCatalogQuery({ q: 'x'.repeat(200) }).search).toHaveLength(64);
		expect(parseCatalogQuery({ category: ['AirPods', 'AirPods', ' Наушники '] }).categories).toEqual([
			'AirPods',
			'Наушники',
		]);
	});

	it('detects whether any filter is active', () => {
		expect(isCatalogQueryActive(parseCatalogQuery())).toBe(false);
		expect(isCatalogQueryActive(parseCatalogQuery({ q: 'pro' }))).toBe(true);
		expect(isCatalogQueryActive(parseCatalogQuery({ availability: 'available' }))).toBe(true);
	});
});

describe('applyCatalogQuery', () => {
	it('returns every product when no filter is applied', () => {
		expect(applyCatalogQuery(catalog, parseCatalogQuery())).toHaveLength(4);
	});

	it('searches name, tagline, category and variant labels case-insensitively', () => {
		const byName = applyCatalogQuery(catalog, parseCatalogQuery({ q: 'PRO' }));
		expect(byName.map((item) => item.product.id)).toEqual(['mid']);

		const byTagline = applyCatalogQuery(catalog, parseCatalogQuery({ q: 'лёгкий' }));
		expect(byTagline.map((item) => item.product.id)).toEqual(['cheap']);
	});

	it('filters by category and by availability', () => {
		expect(applyCatalogQuery(catalog, parseCatalogQuery({ category: 'AirPods' })).map((item) => item.product.id)).toEqual([
			'cheap',
			'unpriced',
		]);
		expect(
			applyCatalogQuery(catalog, parseCatalogQuery({ availability: 'available' })).map((item) => item.product.id),
		).toEqual(['cheap', 'mid', 'unpriced']);
	});

	it('returns an empty list instead of throwing when nothing matches', () => {
		expect(applyCatalogQuery(catalog, parseCatalogQuery({ q: 'нет такого товара' }))).toEqual([]);
	});

	it('keeps products without a known price last in both sort directions', () => {
		const ascending = applyCatalogQuery(catalog, parseCatalogQuery({ sort: 'price-asc' }));
		expect(ascending.map((item) => item.product.id)).toEqual(['cheap', 'mid', 'expensive', 'unpriced']);

		const descending = applyCatalogQuery(catalog, parseCatalogQuery({ sort: 'price-desc' }));
		expect(descending.map((item) => item.product.id)).toEqual(['expensive', 'mid', 'cheap', 'unpriced']);
	});

	it('sorts by name when asked', () => {
		const sorted = applyCatalogQuery(catalog, parseCatalogQuery({ sort: 'name-asc' }));
		expect(sorted.map((item) => item.product.name)).toEqual(['Buds Future', 'Buds Lite', 'Buds Max', 'Buds Pro']);
	});
});

describe('listCategories', () => {
	it('returns unique categories ordered by the Russian collation', () => {
		const categories = listCategories(catalog);

		// The relative position of Cyrillic and Latin labels is decided by the ICU
		// collation, so assert the contract instead of a hard-coded order.
		expect(categories).toHaveLength(3);
		expect([...categories].sort()).toEqual(['AirPods', 'AirPods Pro', 'Наушники']);
		expect(categories).toEqual([...categories].sort((a, b) => a.localeCompare(b, 'ru')));
	});
});
