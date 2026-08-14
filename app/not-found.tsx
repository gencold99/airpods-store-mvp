import Link from 'next/link';

/** Несуществующий товар или опечатка в URL ведёт в каталог, а не в пустой 404. */
export default function NotFound() {
	return (
		<main className="container" id="main" tabIndex={-1}>
			<div className="page-header">
				<div className="eyebrow">404</div>
				<h1>Такой страницы нет</h1>
				<p className="lead">Возможно, модель переименовали или ссылка устарела.</p>
			</div>
			<div className="card">
				<div className="hero-actions">
					<Link className="button primary" href="/shop">
						Перейти в каталог
					</Link>
					<Link className="button secondary" href="/">
						На главную
					</Link>
				</div>
			</div>
		</main>
	);
}
