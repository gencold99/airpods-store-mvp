import Link from 'next/link';
import { productRepository } from '@/lib/repositories';
import { businessConfig } from '@/lib/config';
import { formatPrice, resolveUnitPrice } from '@/lib/pricing';

export default async function Home() {
	const result = await productRepository.list();
	const products = result.ok ? result.data : [];

	return (
		<main id="main" tabIndex={-1}>
			<section className="container hero">
				<div>
					<div className="eyebrow">Bright Future / audio retail</div>
					<h1 className="display">Оригинальный звук. Новый горизонт.</h1>
					<p className="lead">
						Премиальная витрина AirPods с честными данными, понятной покупкой и архитектурой, готовой к реальному магазину.
					</p>
					<div className="hero-actions">
						<Link className="button primary" href="/shop">
							Смотреть каталог
						</Link>
						<a className="button secondary" href="#how">
							Как проходит покупка
						</a>
					</div>
					<div className="trust">
						<span>✓ Данные без выдуманных обещаний</span>
						<span>✓ Оформление без регистрации</span>
					</div>
				</div>
				<div className="hero-art" role="img" aria-label="Слот изображения продукта" />
			</section>

			<section className="section container">
				<div className="eyebrow">Featured</div>
				<h2>Выберите свой ритм</h2>
				<div className="grid">
					{products.map((product) => {
						const { price } = resolveUnitPrice(product, product.variants[0]);
						return (
							<Link className="card product-card" href={`/products/${product.slug}`} key={product.id}>
								<div className="product-image" aria-hidden="true">
									{product.name.split(' ')[1]}
								</div>
								<div>
									<h3>{product.name}</h3>
									<p className="muted">{product.tagline}</p>
									<span className="price">{formatPrice(price)}</span>
								</div>
							</Link>
						);
					})}
				</div>
			</section>

			<section id="how" className="section container">
				<div className="eyebrow">How it works</div>
				<h2>Как проходит покупка</h2>
				<ol className="steps-cards">
					<li className="card">
						<h3>1. Выбор</h3>
						<p className="muted">
							Фильтры, сортировка и быстрый просмотр помогают сравнить модели, не теряя место в каталоге.
						</p>
					</li>
					<li className="card">
						<h3>2. Оформление</h3>
						<p className="muted">
							Гостевое оформление без регистрации. В итоге показаны только товары: стоимость доставки менеджер подтверждает отдельно.
						</p>
					</li>
					<li className="card">
						<h3>3. Подтверждение</h3>
						<p className="muted">
							Заказ фиксируется только после успешной оплаты, а затем менеджер согласует доставку.
						</p>
					</li>
				</ol>
			</section>

			<section id="why" className="section container">
				<div className="eyebrow">Why Bright Future</div>
				<h2>Технологичный магазин без лишнего шума.</h2>
				<ul className="reassurance">
					{businessConfig.trust.map((signal) => (
						<li key={signal.id}>
							<strong>{signal.title}</strong>
							<span className="muted"> {signal.text}</span>
						</li>
					))}
				</ul>
			</section>
		</main>
	);
}
