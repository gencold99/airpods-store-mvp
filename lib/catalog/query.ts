import type { Product } from '../domain';
import { isKnown, type Money } from '../money';
import { resolveUnitPrice, type PriceMode } from '../pricing';

export const SORT_KEYS = ['recommended', 'price-asc', 'price-desc', 'name-asc'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
	{ value: 'recommended', label: 'Рекомендуемые' },
	{ value: 'price-asc', label: 'Цена: сначала дешевле' },
	{ value: 'price-desc', label: 'Цена: сначала дороже' },
	{ value: 'name-asc', label: 'Название: А–Я' },
];

export const AVAILABILITY_KEYS = ['all', 'available'] as const;
export type AvailabilityKey = (typeof AVAILABILITY_KEYS)[number];

export type CatalogQuery = {
	search: string;
	categories: string[];
	sort: SortKey;
	availability: AvailabilityKey;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const MAX_SEARCH_LENGTH = 64;

function readAll(value: string | string[] | undefined): string[] {
	if (typeof value === 'string') return [value];
	if (Array.isArray(value)) return value;
	return [];
}

/** Search params are untrusted input: everything is whitelisted or dropped. */
export function parseCatalogQuery(params: RawSearchParams = {}): CatalogQuery {
	const search = (readAll(params.q)[0] ?? '').trim().slice(0, MAX_SEARCH_LENGTH);

	const categories = readAll(params.category)
		.map((value) => value.trim())
		.filter((value) => value.length > 0);

	const sortCandidate = readAll(params.sort)[0];
	const sort = SORT_KEYS.find((key) => key === sortCandidate) ?? 'recommended';

	const availabilityCandidate = readAll(params.availability)[0];
	const availability = AVAILABILITY_KEYS.find((key) => key === availabilityCandidate) ?? 'all';

	return { search, categories: Array.from(new Set(categories)), sort, availability };
}

export function isCatalogQueryActive(query: CatalogQuery): boolean {
	return (
		query.search.length > 0 ||
		query.categories.length > 0 ||
		query.sort !== 'recommended' ||
		query.availability !== 'all'
	);
}

export function listCategories(products: Product[]): string[] {
	return Array.from(new Set(products.map((product) => product.category))).sort((a, b) => a.localeCompare(b, 'ru'));
}

export type CatalogItem = {
	product: Product;
	price: Money;
	priceMode: PriceMode;
	inStock: boolean;
	/** Купить можно только то, у чего есть и наличие, и известная цена. */
	purchasable: boolean;
};

function toCatalogItem(product: Product): CatalogItem {
	const resolved = resolveUnitPrice(product, product.variants[0]);
	const inStock = product.availability === 'available' && product.variants.some((item) => item.available);

	return {
		product,
		price: resolved.price,
		priceMode: resolved.mode,
		inStock,
		purchasable: inStock && resolved.mode !== 'on-request',
	};
}

function matchesSearch(product: Product, search: string): boolean {
	if (search.length === 0) return true;
	const needle = search.toLowerCase();
	const haystack = [product.name, product.tagline, product.category, ...product.variants.map((variant) => variant.label)];
	return haystack.some((field) => field.toLowerCase().includes(needle));
}

function byName(a: CatalogItem, b: CatalogItem): number {
	return a.product.name.localeCompare(b.product.name, 'ru');
}

/** Unknown prices sort last in both directions: they must never look like the cheapest offer. */
function byPrice(a: CatalogItem, b: CatalogItem, direction: 1 | -1): number {
	const left = isKnown(a.price) ? a.price.amount : null;
	const right = isKnown(b.price) ? b.price.amount : null;
	if (left === null && right === null) return byName(a, b);
	if (left === null) return 1;
	if (right === null) return -1;
	if (left === right) return byName(a, b);
	return (left - right) * direction;
}

export function applyCatalogQuery(products: Product[], query: CatalogQuery): CatalogItem[] {
	const items = products.map(toCatalogItem).filter((item) => {
		if (!matchesSearch(item.product, query.search)) return false;
		if (query.categories.length > 0 && !query.categories.includes(item.product.category)) return false;
		if (query.availability === 'available' && !item.inStock) return false;
		return true;
	});

	switch (query.sort) {
		case 'price-asc':
			return items.sort((a, b) => byPrice(a, b, 1));
		case 'price-desc':
			return items.sort((a, b) => byPrice(a, b, -1));
		case 'name-asc':
			return items.sort(byName);
		case 'recommended':
		default:
			return items;
	}
}
