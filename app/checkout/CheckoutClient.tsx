'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useCart } from '@/lib/cart/CartProvider';
import { formatPrice, summarizeCart } from '@/lib/pricing';
import { formatMoney, isKnown } from '@/lib/money';
import { businessConfig } from '@/lib/config';
import { deliveryProvider } from '@/lib/delivery';
import { analytics } from '@/lib/analytics';
import { initialPaymentState, mockPaymentProvider, paymentReducer } from '@/lib/payment';
import { newOrderReference, orderRepository } from '@/lib/repositories';
import { saveLastOrder } from '@/lib/order/orderStorage';
import type { OrderLine, Product } from '@/lib/domain';

type FormValues = {
	email: string;
	name: string;
	phone: string;
	city: string;
	delivery: string;
	card: string;
	expiry: string;
	cvc: string;
};

type FieldKey = keyof FormValues;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function TextField(props: {
	name: FieldKey;
	label: string;
	value: string;
	error?: string;
	type?: string;
	inputMode?: 'text' | 'numeric' | 'tel' | 'email';
	autoComplete?: string;
	placeholder?: string;
	onChange: (value: string) => void;
}) {
	const id = `field-${props.name}`;
	const errorId = `error-${props.name}`;
	return (
		<div className="field">
			<label htmlFor={id}>{props.label}</label>
			<input
				id={id}
				name={props.name}
				type={props.type ?? 'text'}
				inputMode={props.inputMode}
				autoComplete={props.autoComplete ?? 'off'}
				placeholder={props.placeholder}
				value={props.value}
				onChange={(event) => props.onChange(event.target.value)}
				aria-invalid={props.error ? true : undefined}
				aria-describedby={props.error ? errorId : undefined}
			/>
			{props.error ? (
				<span className="status error" id={errorId}>
					{props.error}
				</span>
			) : null}
		</div>
	);
}

export default function CheckoutClient({ products }: { products: Product[] }) {
	const router = useRouter();
	const { state, dispatch, hydrated } = useCart();
	const summary = useMemo(() => summarizeCart(state, products), [state, products]);
	const [payment, dispatchPayment] = useReducer(paymentReducer, initialPaymentState);
	const [values, setValues] = useState<FormValues>({
		email: '',
		name: '',
		phone: '',
		city: 'Уфа',
		delivery: deliveryProvider.options[0].id,
		card: '',
		expiry: '',
		cvc: '',
	});
	const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
	const cancelled = useRef(false);

	useEffect(() => {
		if (hydrated) analytics.track({ name: 'begin_checkout', itemCount: summary.itemCount });
	}, [hydrated, summary.itemCount]);

	useEffect(() => {
		analytics.track({ name: 'payment_state', status: payment.status });
	}, [payment.status]);

	function setField(field: FieldKey, value: string) {
		setValues((previous) => ({ ...previous, [field]: value }));
	}

	function validate(): Partial<Record<FieldKey, string>> {
		const next: Partial<Record<FieldKey, string>> = {};
		if (!EMAIL_PATTERN.test(values.email.trim())) next.email = 'Укажите корректный email для подтверждения заказа.';
		if (values.name.trim().length < 2) next.name = 'Укажите имя получателя.';
		if (values.phone.replace(/\D/g, '').length < 10) next.phone = 'Укажите телефон в формате +7 999 000 00 00.';
		if (values.city.trim().length < 2) next.city = 'Укажите город доставки.';
		if (values.card.replace(/\D/g, '').length !== 16) next.card = 'Номер карты должен содержать 16 цифр.';
		if (!/^\d{2}\/\d{2}$/.test(values.expiry.trim())) next.expiry = 'Укажите срок в формате ММ/ГГ.';
		if (!/^\d{3}$/.test(values.cvc.trim())) next.cvc = 'CVC состоит из 3 цифр.';
		return next;
	}

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (payment.status === 'submitting' || payment.status === 'success') return;

		const validation = validate();
		setErrors(validation);
		const firstError = Object.keys(validation)[0];
		if (firstError) {
			document.getElementById(`field-${firstError}`)?.focus();
			return;
		}

		if (!isKnown(summary.total) || summary.total.amount <= 0) {
			dispatchPayment({ type: 'submit' });
			dispatchPayment({ type: 'fail', reason: 'Итоговая сумма не определена, оплата не выполнена.' });
			return;
		}

		cancelled.current = false;
		dispatchPayment({ type: 'submit' });

		const reference = newOrderReference();
		const result = await mockPaymentProvider.authorize({
			amount: summary.total,
			cardNumber: values.card,
			expiry: values.expiry,
			cvc: values.cvc,
			orderReference: reference,
		});

		if (cancelled.current) return;

		if (!result.ok) {
			dispatchPayment({ type: 'fail', reason: result.reason });
			return;
		}

		const lines: OrderLine[] = summary.lines.map((line) => ({
			productId: line.productId,
			variantId: line.variantId,
			name: line.name,
			variantLabel: line.variantLabel,
			quantity: line.quantity,
			unitPrice: line.unitPrice,
			lineTotal: line.lineTotal,
		}));

		const deliveryOption = deliveryProvider.find(values.delivery);
		const order = await orderRepository.create({
			customer: {
				email: values.email.trim(),
				name: values.name.trim(),
				phone: values.phone.trim(),
				city: values.city.trim(),
			},
			lines,
			subtotal: summary.subtotal,
			discount: summary.discount,
			total: summary.total,
			promoCode: summary.promo.status === 'valid' ? summary.promo.code : null,
			deliveryOptionId: values.delivery,
			deliveryLabel: deliveryOption?.label ?? 'Доставка уточняется',
			// Снимок статуса на момент заказа: подтверждение не должно врать даже после смены конфигурации.
			deliveryCostStatus: businessConfig.delivery.pricingStatus === 'pending' ? 'pending' : 'confirmed',
			paymentReference: result.reference,
			pricingIsDemo: summary.hasDemoPrices,
		});

		if (!order.ok) {
			dispatchPayment({ type: 'fail', reason: order.error });
			return;
		}

		dispatchPayment({ type: 'succeed', reference: result.reference });
		saveLastOrder(order.data);
		analytics.track({ name: 'purchase', orderId: order.data.id });
		dispatch({ type: 'clear' });
		router.push('/order/confirmation');
	}

	if (payment.status === 'success') {
		return (
			<div className="card">
				<p className="status ok" role="status" aria-live="polite">
					Оплата подтверждена. Открываем страницу подтверждения заказа…
				</p>
				<Link className="button primary" href="/order/confirmation">
					Перейти к подтверждению
				</Link>
			</div>
		);
	}

	if (!hydrated) {
		return (
			<div className="card">
				<p className="muted" role="status">
					Загружаем данные заказа…
				</p>
			</div>
		);
	}

	if (summary.lines.length === 0) {
		return (
			<div className="card">
				<h2>Оформлять пока нечего</h2>
				<p className="muted">Корзина пуста, поэтому оплата недоступна.</p>
				<Link className="button primary" href="/shop">
					Перейти в каталог
				</Link>
			</div>
		);
	}

	// Нет цены — нет суммы. Мы не открываем оплату на числе, которого не знаем.
	if (!summary.pricingComplete) {
		return (
			<div className="card">
				<h2>Итог пока нельзя посчитать</h2>
				<p className="status warn">
					В корзине есть позиции с ценой по запросу, поэтому оплата недоступна: показывать сумму, которой мы не знаем, нельзя.
				</p>
				<p className="muted">{businessConfig.pricing.onRequestNote}</p>
				<Link className="button primary" href="/cart">
					Вернуться в корзину
				</Link>
			</div>
		);
	}

	const busy = payment.status === 'submitting';

	return (
		<div className="layout-2col">
			<form className="card form" onSubmit={onSubmit} noValidate>
				<ol className="steps">
					<li aria-current="step">1. Контакты и доставка</li>
					<li>2. Оплата</li>
					<li>3. Подтверждение</li>
				</ol>

				<fieldset>
					<legend>Контакты получателя</legend>
					<TextField name="email" label="Email" type="email" inputMode="email" autoComplete="email" value={values.email} error={errors.email} onChange={(value) => setField('email', value)} />
					<TextField name="name" label="Имя и фамилия" autoComplete="name" value={values.name} error={errors.name} onChange={(value) => setField('name', value)} />
					<TextField name="phone" label="Телефон" type="tel" inputMode="tel" autoComplete="tel" value={values.phone} error={errors.phone} onChange={(value) => setField('phone', value)} />
					<TextField name="city" label="Город" autoComplete="address-level2" value={values.city} error={errors.city} onChange={(value) => setField('city', value)} />
				</fieldset>

				<fieldset>
					<legend>Способ доставки</legend>
					{deliveryProvider.options.map((option) => (
						<div className="radio-row" key={option.id}>
							<input
								id={`delivery-${option.id}`}
								type="radio"
								name="delivery"
								value={option.id}
								checked={values.delivery === option.id}
								onChange={(event) => setField('delivery', event.target.value)}
							/>
							<label htmlFor={`delivery-${option.id}`}>
								{option.label}
								<span className="muted"> — стоимость уточняется</span>
							</label>
						</div>
					))}
				</fieldset>

				<fieldset>
					<legend>Оплата картой</legend>
					<p className="status info">{businessConfig.payment.disclaimer}</p>
					<p className="muted" style={{ fontSize: 13 }}>
						Тестовые карты: успешная {businessConfig.payment.testCards.success}, отклонённая {businessConfig.payment.testCards.declined}.
					</p>
					<TextField name="card" label="Номер карты" inputMode="numeric" value={values.card} error={errors.card} onChange={(value) => setField('card', value)} />
					<TextField name="expiry" label="Срок действия (ММ/ГГ)" inputMode="numeric" placeholder="12/29" value={values.expiry} error={errors.expiry} onChange={(value) => setField('expiry', value)} />
					<TextField name="cvc" label="CVC" inputMode="numeric" value={values.cvc} error={errors.cvc} onChange={(value) => setField('cvc', value)} />
				</fieldset>

				<div role="status" aria-live="polite">
					{payment.status === 'submitting' ? <p className="status info">Проводим оплату. Не закрывайте страницу.</p> : null}
					{payment.status === 'failed' ? <p className="status error">Оплата не прошла: {payment.error}</p> : null}
					{payment.status === 'cancelled' ? <p className="status warn">Оплата отменена. Заказ не оформлен, корзина сохранена.</p> : null}
				</div>

				<div className="hero-actions">
					<button className="button accent" type="submit" disabled={busy} aria-busy={busy}>
						{busy ? <span className="spinner" aria-hidden="true" /> : null}
						{busy
							? 'Оплачиваем…'
							: payment.status === 'failed' || payment.status === 'cancelled'
								? 'Повторить оплату'
								: `Оплатить товары: ${formatPrice(summary.total)}`}
					</button>
					{busy ? (
						<button
							className="button secondary"
							type="button"
							onClick={() => {
								cancelled.current = true;
								dispatchPayment({ type: 'cancel' });
							}}
						>
							Отменить оплату
						</button>
					) : (
						<Link className="button secondary" href="/cart">
							Вернуться в корзину
						</Link>
					)}
				</div>
			</form>

			<aside className="card summary" aria-labelledby="checkout-summary-heading">
				<h2 id="checkout-summary-heading">Ваш заказ</h2>
				<ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
					{summary.lines.map((line) => (
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
				<div className="summary-row">
					<span>Товары ({summary.itemCount})</span>
					<span>{formatPrice(summary.subtotal)}</span>
				</div>
				<div className="summary-row">
					<span>Скидка{summary.promo.status === 'valid' ? ` (${summary.promo.code})` : ''}</span>
					<span>−{formatMoney(summary.discount, '0 ₽')}</span>
				</div>
				<div className="summary-row">
					<span>Доставка</span>
					<span>{businessConfig.totals.deliveryValue}</span>
				</div>
				{/* Не «К оплате»: доставка ещё не посчитана, поэтому итог честно назван итогом за товары. */}
				<div className="summary-row total">
					<span>{businessConfig.totals.goodsLabel}</span>
					<span>{formatPrice(summary.total)}</span>
				</div>
				<p className="muted" style={{ fontSize: 13 }}>
					{businessConfig.totals.explanation}
				</p>
				{summary.hasDemoPrices ? <p className="status warn">{businessConfig.pricing.demoDisclaimer}</p> : null}

				<h3>Что будет после оплаты</h3>
				<ol className="next-steps">
					<li>Заказ фиксируется с номером и статусом «оплачено».</li>
					<li>Менеджер связывается по телефону и подтверждает стоимость и срок доставки.</li>
					<li>Отправка — после согласования доставки.</li>
				</ol>

				<h3>Почему можно доверять</h3>
				<ul className="reassurance">
					{businessConfig.trust.map((signal) => (
						<li key={signal.id}>
							<strong>{signal.title}</strong>
							<span className="muted"> {signal.text}</span>
						</li>
					))}
				</ul>
			</aside>
		</div>
	);
}
