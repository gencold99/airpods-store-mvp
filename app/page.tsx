import Link from 'next/link';
import { productRepository } from '@/lib/repositories';
import { businessConfig } from '@/lib/config';
import { formatPrice, resolveUnitPrice } from '@/lib/pricing';
import { buildFaq } from '@/lib/faq';
import TrustList from './components/TrustList';

export default async function Home() {
	const result = await productRepository.list();
	const products = result.ok ? result.data : [];
	const faq = buildFaq();

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
							Выбрать AirPods
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
				{/* Слот называется слотом: фотографии ещё нет, и обещать её содержание мы не можем. */}
				<div
					className="hero-art"
					role="img"
					aria-label="Слот изображения продукта: фотография будет добавлена вместе с товарными данными"
				/>
			</section>

			<section className="section container">
				<div className="eyebrow">Featured</div>
				<h2>Выберите свой ритм</h2>

				{/* Ошибка загрузки и пустой каталог — разные события, и путать их нельзя. */}
				{!result.ok ? (
					<div className="card" role="alert">
						<p className="status error">Не удалось загрузить подборку моделей.</p>
						<p className="muted">Обновите страницу или откройте каталог напрямую.</p>
						<Link className="button primary" href="/shop">
							Перейти в каталог
						</Link>
					</div>
				) : products.length === 0 ? (
					<div className="card">
						<p className="muted">Подборка появится, как только в каталог добавят модели.</p>
					</div>
				) : (
					<div className="grid">
						{products.map((product) => {
							const { price } = resolveUnitPrice(product, product.variants[0]);
							return (
								<Link className="card product-card" href={`/products/${product.slug}`} key={product.id}>
									{/* Был aria-hidden: скринридер не сообщал ничего там, где глазом виден пустой слот. */}
									<div
										className="product-image"
										role="img"
										aria-label={`${product.name}: слот изображения, фотография уточняется`}
									>
										<span aria-hidden="true">{product.name.split(' ')[1]}</span>
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
				)}
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
				{/* Статус сигнала рисуется из данных: неподтверждённое помечено как «Уточняется». */}
				<TrustList signals={businessConfig.trust} label="Почему нам можно доверять" />
			</section>

			<section id="faq" className="section container">
				<div className="eyebrow">FAQ</div>
				<h2>Частые вопросы</h2>
				{/* details/summary: клавиатура и скринридеры работают без нашего JS и без зависимостей. */}
				<div className="faq">
					{faq.map((item) => (
						<details className="card faq-item" key={item.id}>
							<summary>{item.question}</summary>
							<p className="muted">{item.answer}</p>
						</details>
					))}
				</div>
			</section>

			<section className="section container">
				<div className="card cta-band">
					<div>
						<h2>Готовы выбрать модель?</h2>
						<p className="muted">
							Сравните модели в каталоге. Если цена пока указана как «{businessConfig.pricing.onRequestLabel}», менеджер подтвердит стоимость по заявке.
						</p>
					</div>
					<Link className="button accent" href="/shop">
						Открыть каталог
					</Link>
				</div>
			</section>
		</main>
	);
}
