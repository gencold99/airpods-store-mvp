/**
 * Skeleton повторяет геометрию главной: те же блоки и те же высоты, чтобы при появлении
 * контента не было layout shift. Анимацию глушит глобальное правило prefers-reduced-motion.
 */
export default function HomeLoading() {
	return (
		<main className="container" id="main" tabIndex={-1} aria-busy="true">
			<p className="visually-hidden" role="status">
				Загружаем главную страницу
			</p>
			<div className="hero" aria-hidden="true">
				<div>
					<div className="skeleton skeleton-eyebrow" />
					<div className="skeleton skeleton-display" />
					<div className="skeleton skeleton-lead" />
					<div className="skeleton skeleton-button" />
				</div>
				<div className="skeleton skeleton-hero-art" />
			</div>
			<div className="grid" aria-hidden="true">
				{[0, 1, 2].map((index) => (
					<div className="card product-card" key={index}>
						<div className="skeleton skeleton-product-image" />
						<div className="skeleton skeleton-title" />
						<div className="skeleton skeleton-text" />
					</div>
				))}
			</div>
		</main>
	);
}
