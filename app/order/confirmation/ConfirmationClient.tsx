'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { readLastOrder } from '@/lib/order/orderStorage';
import { formatMoney } from '@/lib/money';
import { businessConfig } from '@/lib/config';
import type { Order } from '@/lib/domain';

export default function ConfirmationClient() {
	const [order, setOrder] = useState<Order | null>(null);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		setOrder(readLastOrder());
		setReady(true);
	}, []);

	if (!ready) {
		return (
			<div className="card">
				<p className="muted" role="status">
					Проверяем статус заказа…
				</p>
			</div>
		);
	}

	// A confirmation is shown only for an order created after a successful payment.
	if (!order) {
		return (
			<div className="card">
				<h2>Подтверждённого заказа нет</h2>
				<p className="status info">Мы не нашли оплаченный заказ в этой сессии, поэтому подтверждение не показывается.</p>
				<Link className="button primary" href="/cart">
					Вернуться в корзину
				</Link>
			</div>
		);
	}

	return (
		<div className="layout-2col">
			<section className="card" aria-labelledby="confirmation-heading">
				<p className="badge">Оплачено</p>
				<h2 id="confirmation-heading">Заказ {order.id} подтверждён</h2>
				<p className="muted">
					Подтверждение отправим на {order.customer.email}. Менеджер свяжется по телефону {order.customer.phone} для согласования доставки.
				</p>
				<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
					{order.lines.map((line) => (
						<li className="summary-row" key={`${line.productId}:${line.variantId}`}>
							<span>
								{line.name} × {line.quantity}
								<br />
								<span className="muted" style={{ fontSize: 13 }}>
									{line.variantLabel}
								</span>
							</span>
							<span>{formatMoney(line.lineTotal)}</span>
						</li>
					))}
				</ul>
				<div className="summary-row total">
					<span>Оплачено</span>
					<span>{formatMoney(order.total)}</span>
				</div>
				<Link className="button primary" href="/shop">
					Продолжить покупки
				</Link>
			</section>

			<aside className="card summary" aria-labelledby="confirmation-details">
				<h2 id="confirmation-details">Детали</h2>
				<div className="summary-row">
					<span>Получатель</span>
					<span>{order.customer.name}</span>
				</div>
				<div className="summary-row">
					<span>Город</span>
					<span>{order.customer.city}</span>
				</div>
				<div className="summary-row">
					<span>Доставка</span>
					<span>{order.deliveryLabel}</span>
				</div>
				<div className="summary-row">
					<span>Промокод</span>
					<span>{order.promoCode ?? '—'}</span>
				</div>
				<div className="summary-row">
					<span>Платёж</span>
					<span>{order.paymentReference}</span>
				</div>
				<p className="muted" style={{ fontSize: 13 }}>
					{businessConfig.delivery.note}
				</p>
				{order.pricingIsPlaceholder ? <p className="status warn">{businessConfig.pricing.disclaimer}</p> : null}
			</aside>
		</div>
	);
}
