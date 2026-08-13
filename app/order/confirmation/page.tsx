import type { Metadata } from 'next';
import ConfirmationClient from './ConfirmationClient';

export const metadata: Metadata = {
	title: 'Заказ подтверждён — Bright Future',
	description: 'Подтверждение оплаченного заказа.',
	robots: { index: false, follow: false },
};

export default function ConfirmationPage() {
	return (
		<main className="container" id="main" tabIndex={-1}>
			<div className="page-header">
				<div className="eyebrow">Order</div>
				<h1>Подтверждение заказа</h1>
				<p className="lead">Страница доступна только после успешной оплаты.</p>
			</div>
			<ConfirmationClient />
		</main>
	);
}
