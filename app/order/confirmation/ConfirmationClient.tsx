'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
	consumeConfirmationHandoff,
	readConfirmationHandoff,
	type HandoffRejection,
} from '@/lib/order/orderStorage';
import { formatPrice } from '@/lib/pricing';
import { businessConfig } from '@/lib/config';
import type { Order } from '@/lib/domain';

type ViewState =
	| { status: 'checking' }
	| { status: 'confirmed'; order: Order }
	| { status: 'rejected'; reason: HandoffRejection };

/** Отказ объясняется честно и без деталей, которые помогли бы подобрать валидную запись. */
const REJECTION_COPY: Record<HandoffRejection, string> = {
	missing: 'Мы не нашли оплаченный заказ в этой сессии, поэтому подтверждение не показывается.',
	malformed: 'Данные заказа в этой сессии повреждены или изменены, поэтому подтверждение не показывается.',
	unpaid: 'У заказа нет подтверждённой успешной оплаты, поэтому подтверждение не показывается.',
	'token-mismatch': 'Подтверждение не связано с оплаченным заказом этой сессии, поэтому мы его не показываем.',
	expired: 'Ссылка подтверждения одноразовая и уже использована или устарела. Номер заказа и статус оплаты подтвердит менеджер.',
};

export default function ConfirmationClient() {
	const [view, setView] = useState<ViewState>({ status: 'checking' });
	const checked = useRef(false);

	useEffect(() => {
		// Handoff читается ровно один раз за монтирование: повторный проход не должен «съесть» заказ.
		if (checked.current) return;
		checked.current = true;

		const result = readConfirmationHandoff();
		if (!result.ok) {
			setView({ status: 'rejected', reason: result.reason });
			return;
		}

		setView({ status: 'confirmed', order: result.handoff.order });
		// Одноразовость: после успешного подтверждения запись потребляется.
		consumeConfirmationHandoff(result.handoff.token);
	}, []);

	if (view.status === 'checking') {
		return (
			<div className="card">
				<p className="muted" role="status">
					Проверяем статус заказа…
				</p>
			</div>
		);
	}

	// A confirmation is shown only for an order created after a successful payment.
	if (view.status === 'rejected') {
		return (
			<div className="card">
				<h2>Подтверждённого заказа нет</h2>
				<p className="status info">{REJECTION_COPY[view.reason]}</p>
				<Link className="button primary" href="/cart">
					Вернуться в корзину
				</Link>
			</div>
		);
	}

	const order = view.order;

	return (
		<div className="layout-2col">
			<section className="card" aria-labelledby="confirmation-heading">
				<p className="badge">Оплачено</p>
				<h2 id="confirmation-heading">Заказ {order.id} подтверждён</h2>
				{/* Никаких обещаний, которых нельзя выполнить: письма отправляет backend, его пока нет. */}
				<p className="muted">
					Заказ закреплён за {order.customer.email}. Менеджер свяжется по телефону {order.customer.phone}, чтобы подтвердить доставку и её стоимость.
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
							<span>{formatPrice(line.lineTotal)}</span>
						</li>
					))}
				</ul>
				<div className="summary-row total">
					<span>Оплачено за товары</span>
					<span>{formatPrice(order.total)}</span>
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
					<span>Стоимость доставки</span>
					<span>{order.deliveryCostStatus === 'pending' ? businessConfig.totals.deliveryValue : 'Подтверждена'}</span>
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
					{businessConfig.totals.explanation}
				</p>
				{/* Mock-оплата и клиентский handoff: обещать серверную квитанцию мы не можем. */}
				<p className="status info">{businessConfig.payment.disclaimer}</p>
				<p className="muted" style={{ fontSize: 13 }}>
					Эта страница подтверждения открывается один раз: серверной квитанции пока нет, поэтому номер заказа стоит сохранить, а статус подтвердит менеджер.
				</p>
				{order.pricingIsDemo ? <p className="status warn">{businessConfig.pricing.demoDisclaimer}</p> : null}
			</aside>
		</div>
	);
}
