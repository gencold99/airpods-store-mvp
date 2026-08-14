/** Галерея и buy box занимают ту же площадь, что и готовая страница товара. */
export default function ProductLoading() {
	return (
		<main className="container" id="main" tabIndex={-1} aria-busy="true">
			<div className="page-header" style={{ paddingBottom: 16 }}>
				<p className="muted" role="status">
					Загружаем товар…
				</p>
			</div>
			<div className="pdp" aria-hidden="true">
				<div className="gallery">
					<div className="skeleton skeleton-gallery" />
					<div className="skeleton skeleton-rail" />
				</div>
				<div className="card buy-box">
					<div className="skeleton skeleton-title" />
					<div className="skeleton skeleton-text" />
					<div className="skeleton skeleton-price" />
					<div className="skeleton skeleton-button" />
				</div>
			</div>
		</main>
	);
}
