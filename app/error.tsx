'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * Ошибка не должна быть тупиком: reset() повторяет рендер сегмента без перезагрузки
 * страницы, так что корзина и введённые данные не теряются.
 *
 * Текст ошибки наружу не выводим: в нём могут быть детали реализации. Для диагностики
 * есть digest, который можно назвать поддержке.
 */
export default function GlobalRouteError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<main className="container" id="main" tabIndex={-1}>
			<div className="page-header">
				<div className="eyebrow">Error</div>
				<h1>Страница не загрузилась</h1>
			</div>
			<div className="card" role="alert">
				<p className="status error">Что-то пошло не так на нашей стороне. Заказ и корзина не потеряны.</p>
				<div className="hero-actions">
					<button className="button primary" type="button" onClick={() => reset()}>
						Повторить попытку
					</button>
					<Link className="button secondary" href="/shop">
						Перейти в каталог
					</Link>
				</div>
				{error.digest ? (
					<p className="muted" style={{ fontSize: 13 }}>
						Код для поддержки: {error.digest}
					</p>
				) : null}
			</div>
		</main>
	);
}
