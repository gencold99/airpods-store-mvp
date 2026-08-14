import type { Metadata } from 'next';
import CheckoutClient from './CheckoutClient';
import { productRepository } from '@/lib/repositories';

export const metadata: Metadata = {
	title: 'Оформление заказа — Bright Future',
	description: 'Гостевое оформление: контакты, доставка, оплата и подтверждение.',
	robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
	const result = await productRepository.list();

	return (
		<main className="container" id="main" tabIndex={-1}>
			<div className="page-header">
				<div className="eyebrow">Checkout</div>
				<h1>Оформление заказа</h1>
				<p className="lead">Guest checkout: контакт → доставка → оплата → подтверждение.</p>
			</div>
			{result.ok ? (
				<CheckoutClient products={result.data} />
			) : (
				<div className="status error" role="alert">
					Не удалось загрузить данные заказа. Обновите страницу.
				</div>
			)}
		</main>
	);
}
