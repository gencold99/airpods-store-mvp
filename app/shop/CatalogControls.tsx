'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import Overlay from '@/app/components/Overlay';
import { SORT_OPTIONS, isCatalogQueryActive, type CatalogQuery } from '@/lib/catalog/query';

type Chip = { key: string; label: string; href: string };

function hrefFor(query: CatalogQuery): string {
	const params = new URLSearchParams();
	if (query.search.length > 0) params.set('q', query.search);
	for (const category of query.categories) params.append('category', category);
	if (query.sort !== 'recommended') params.set('sort', query.sort);
	if (query.availability !== 'all') params.set('availability', query.availability);
	const queryString = params.toString();
	return queryString.length > 0 ? `/shop?${queryString}` : '/shop';
}

/** Каждый активный фильтр виден снаружи и снимается по одному, без открытия панели. */
function chipsFor(query: CatalogQuery): Chip[] {
	const chips: Chip[] = [];

	if (query.search.length > 0) {
		chips.push({ key: 'q', label: `Поиск: ${query.search}`, href: hrefFor({ ...query, search: '' }) });
	}
	for (const category of query.categories) {
		chips.push({
			key: `category:${category}`,
			label: category,
			href: hrefFor({ ...query, categories: query.categories.filter((item) => item !== category) }),
		});
	}
	if (query.availability === 'available') {
		chips.push({ key: 'availability', label: 'Только в наличии', href: hrefFor({ ...query, availability: 'all' }) });
	}
	const sortOption = SORT_OPTIONS.find((option) => option.value === query.sort);
	if (query.sort !== 'recommended' && sortOption) {
		chips.push({ key: 'sort', label: sortOption.label, href: hrefFor({ ...query, sort: 'recommended' }) });
	}

	return chips;
}

/**
 * Progressive enhancement: это реальная GET-форма на /shop, поэтому фильтрация работает
 * без JS. С JS форма апгрейдится до client-side перехода, а на мобильном панель
 * превращается в drawer, где изменения локальны до нажатия кнопки.
 */
export default function CatalogControls({
	query,
	categories,
	resultCount,
}: {
	query: CatalogQuery;
	categories: string[];
	resultCount: number;
}) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [enhanced, setEnhanced] = useState(false);
	const [drawerOpen, setDrawerOpen] = useState(false);

	useEffect(() => setEnhanced(true), []);

	function submit(form: HTMLFormElement) {
		const data = new FormData(form);
		const params = new URLSearchParams();

		const search = String(data.get('q') ?? '').trim();
		if (search.length > 0) params.set('q', search);

		for (const value of data.getAll('category')) params.append('category', String(value));

		const sort = String(data.get('sort') ?? 'recommended');
		if (sort !== 'recommended') params.set('sort', sort);

		if (data.get('availability') === 'available') params.set('availability', 'available');

		const queryString = params.toString();
		setDrawerOpen(false);
		startTransition(() => router.push(queryString.length > 0 ? `/shop?${queryString}` : '/shop', { scroll: false }));
	}

	const chips = chipsFor(query);

	const panel = (
		<div className={drawerOpen ? 'catalog-panel is-drawer' : 'catalog-panel is-inline'}>
			{drawerOpen ? (
				<div className="drawer-head">
					<h2 id="catalog-filters-title">Фильтры</h2>
					<button className="link-button" type="button" onClick={() => setDrawerOpen(false)}>
						Закрыть
					</button>
				</div>
			) : null}

			<div className="drawer-body">
				<div className="field">
					<label htmlFor="catalog-search">Поиск по каталогу</label>
					<input
						id="catalog-search"
						name="q"
						type="search"
						defaultValue={query.search}
						placeholder="Например, Pro"
						autoComplete="off"
						maxLength={64}
					/>
				</div>

				<fieldset>
					<legend>Категория</legend>
					{categories.map((category, index) => {
						const id = `catalog-category-${index}`;
						return (
							<div className="radio-row" key={category}>
								<input
									id={id}
									type="checkbox"
									name="category"
									value={category}
									defaultChecked={query.categories.includes(category)}
								/>
								<label htmlFor={id}>{category}</label>
							</div>
						);
					})}
				</fieldset>

				<div className="radio-row">
					<input
						id="catalog-availability"
						type="checkbox"
						name="availability"
						value="available"
						defaultChecked={query.availability === 'available'}
					/>
					<label htmlFor="catalog-availability">Только в наличии</label>
				</div>
			</div>

			<div className="drawer-foot">
				<button className="button primary" type="submit" aria-busy={pending}>
					{pending ? 'Обновляем…' : 'Показать результаты'}
				</button>
				{isCatalogQueryActive(query) ? (
					<Link className="link-button" href="/shop">
						Сбросить
					</Link>
				) : null}
			</div>
		</div>
	);

	return (
		<form
			// Ремонтирование на смене query синхронизирует uncontrolled поля с URL.
			key={`${query.search}|${query.categories.join(',')}|${query.sort}|${query.availability}`}
			className="catalog-form"
			action="/shop"
			method="get"
			role="search"
			aria-label="Фильтры каталога"
			data-enhanced={enhanced ? 'true' : 'false'}
			onSubmit={(event) => {
				event.preventDefault();
				submit(event.currentTarget);
			}}
			onChange={(event: React.ChangeEvent<HTMLFormElement>) => {
				// В drawer изменения применяются кнопкой, а не на каждый тап.
				if (drawerOpen) return;
				const target = event.target as HTMLElement;
				// Набор текста не должен вызывать навигацию на каждом символе.
				if (target instanceof HTMLInputElement && (target.type === 'text' || target.type === 'search')) return;
				submit(event.currentTarget);
			}}
		>
			<div className="catalog-toolbar">
				<button
					className="button secondary catalog-filters-toggle"
					type="button"
					aria-expanded={drawerOpen}
					onClick={() => setDrawerOpen(true)}
				>
					Фильтры{chips.length > 0 ? ` · ${chips.length}` : ''}
				</button>

				<div className="field field-inline">
					<label htmlFor="catalog-sort">Сортировка</label>
					<select id="catalog-sort" name="sort" defaultValue={query.sort}>
						{SORT_OPTIONS.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</div>

				<p className="muted catalog-count" role="status" aria-live="polite">
					Найдено моделей: {resultCount}
				</p>
			</div>

			{chips.length > 0 ? (
				<ul className="filter-chips" aria-label="Активные фильтры">
					{chips.map((chip) => (
						<li key={chip.key}>
							<Link className="chip" href={chip.href}>
								{chip.label}
								<span aria-hidden="true"> ×</span>
								<span className="visually-hidden"> — убрать фильтр</span>
							</Link>
						</li>
					))}
				</ul>
			) : null}

			{drawerOpen ? (
				<Overlay open onClose={() => setDrawerOpen(false)} titleId="catalog-filters-title" variant="sheet">
					{panel}
				</Overlay>
			) : (
				panel
			)}
		</form>
	);
}
