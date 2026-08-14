'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { SORT_OPTIONS, isCatalogQueryActive, type CatalogQuery } from '@/lib/catalog/query';

/**
 * Progressive enhancement: this is a real GET form pointing at /shop, so filtering
 * works with JavaScript disabled. When JS is available we intercept the submit and
 * do a client-side transition instead, and non-text controls apply immediately.
 */
export default function CatalogControls({
	query,
	categories,
}: {
	query: CatalogQuery;
	categories: string[];
}) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();

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
		startTransition(() => router.push(queryString.length > 0 ? `/shop?${queryString}` : '/shop', { scroll: false }));
	}

	return (
		<form
			// Remounting on query change keeps the uncontrolled inputs in sync with the URL.
			key={`${query.search}|${query.categories.join(',')}|${query.sort}|${query.availability}`}
			className="card form"
			action="/shop"
			method="get"
			role="search"
			aria-label="Фильтры каталога"
			onSubmit={(event) => {
				event.preventDefault();
				submit(event.currentTarget);
			}}
			onChange={(event: React.ChangeEvent<HTMLFormElement>) => {
				const target = event.target as HTMLElement;
				// Typing must not trigger a navigation on every keystroke.
				if (target instanceof HTMLInputElement && (target.type === 'text' || target.type === 'search')) return;
				submit(event.currentTarget);
			}}
		>
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

			<div className="field">
				<label htmlFor="catalog-sort">Сортировка</label>
				<select id="catalog-sort" name="sort" defaultValue={query.sort}>
					{SORT_OPTIONS.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</select>
			</div>

			<div className="hero-actions">
				<button className="button secondary" type="submit" aria-busy={pending}>
					{pending ? 'Обновляем…' : 'Показать'}
				</button>
				{isCatalogQueryActive(query) ? (
					<Link className="link-button" href="/shop">
						Сбросить фильтры
					</Link>
				) : null}
			</div>
		</form>
	);
}
