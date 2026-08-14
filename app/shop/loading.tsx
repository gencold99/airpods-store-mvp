/** Те же высоты, что у реального каталога: тулбар, панель фильтров и сетка карточек. */
export default function ShopLoading() {
	return (
		<main className="container" id="main" tabIndex={-1} aria-busy="true">
			<div className="page-header">
				<div className="eyebrow">Catalog</div>
				<h1>Каталог</h1>
				<p className="muted" role="status">
					Загружаем модели…
				</p>
			</div>
			<div aria-hidden="true">
				<div className="skeleton skeleton-toolbar" />
				<div className="skeleton skeleton-panel" />
				<div className="grid">
					{[0, 1, 2, 3, 4, 5].map((index) => (
						<div className="card product-card" key={index}>
							<div className="skeleton skeleton-product-image" />
							<div className="skeleton skeleton-title" />
							<div className="skeleton skeleton-text" />
							<div className="skeleton skeleton-button" />
						</div>
					))}
				</div>
			</div>
		</main>
	);
}
