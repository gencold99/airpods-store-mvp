import type { Metadata } from 'next';
import CartClient from './CartClient';
import { productRepository } from '@/lib/repositories';

export const metadata: Metadata = {
	title: 'Корзина — Bright Future',
	description: 'Проверьте выбранные товары, промокод и итоговую сумму заказа.',
	robots: { index: false, follow: true },
};

export default async function CartPage() {
	const result = await productRepository.list();
	const products = result.ok ? result.data : [];

	return (
		<main className="container" id="main" tabIndex={-1}>
			<div className="page-header">
				<div className="eyebrow">Cart</div>
				<h1>Корзина</h1>
				<p className="lead">Выбранные товары, промокод и прозрачный расчёт заказа.</p>
			</div>
			{result.ok ? (
				<CartClient products={products} />
			) : (
				<div className="status error" role="alert">
					Не удалось загрузить данные о товарах. Обновите страницу.
				</div>
			)}
		</main>
	);
}
