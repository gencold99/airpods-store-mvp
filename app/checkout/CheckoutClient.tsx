'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useCart } from '@/lib/cart/CartProvider';
import { summarizeCart } from '@/lib/pricing';
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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
	const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
	const cancelled = useRef(false);

	useEffect(() => {
		if (hydrated) analytics.track({ name: 'begin_checkout', itemCount: summary.itemCount });
	}, [hydrated, summary.itemCount]);

	useEffect(() => {
		analytics.track({ name: 'payment_state', status: payment.status });
	}, [payment.status]);

	function setField(field: keyof FormValues, value: string) {
		setValues((previous) => ({ ...previous, [field]: value }));
	}

	function validate(): Partial<Record<keyof FormValues, string>> {
		const next: Partial<Record<keyof FormValues, string>> = {};
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
			paymentReference: result.reference,
			pricingIsPlaceholder: summary.hasPlaceholderPrices,
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
					<div className="field">
						<label htmlFor="field-email">Email</label>
						<input
							id="field-email"
							type="email"
							autoComplete="email"
							value={values.email}
							onChange={(event) => setField('email', event.target.value)}
							aria-invalid={Boolean(errors.email)}
							aria-describedby={errors.email ? 'error-email' : undefined}
						/>
						{errors.email ? (
							<span className="status error" id="error-email">
								{errors.email}
							</span>
						) : null}
					</div>
					<div className="field">
						<label htmlFor="field-name">Имя и фамилия</label>
						<input
							id="field-name"
							autoComplete="name"
							value={values.name}
							onChange={(event) => setField('name', event.target.value)}
							aria-invalid={Boolean(errors.name)}
							aria-describedby={errors.name ? 'error-name' : undefined}
						/>
						{errors.name ? (
							<span className="status error" id="error-name">
								{errors.name}
							</span>
						) : null}
					</div>
					<div className="field">
						<label htmlFor="field-phone">Телефон</label>
						<input
							id="field-phone"
							type="tel"
							inputMode="tel"
							autoComplete="tel"
							value={values.phone}
							onChange={(event) => setField('phone', event.target.value)}
							aria-invalid={Boolean(errors.phone)}
							aria-describedby={errors.phone ? 'error-phone' : undefined}
						/>
						{errors.phone ? (
							<span className="status error" id="error-phone">
								{errors.phone}
							</span>
						) : null}
					</div>
					<div className="field">
						<label htmlFor="field-city">Город</label>
						<input
							id="field-city"
							autoComplete="address-level2"
							value={values.city}
							onChange={(event) => setField('city', event.target.value)}
							aria-invalid={Boolean(errors.city)}
							aria-describedby={errors.city ? 'error-city' : undefined}
						/>
						{errors.city ? (
							<span className="status error" id="error-city">
								{errors.city}
							</span>
						) : null}
					</div>
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
					<div className="field">
						<label htmlFor="field-card">Номер карты</label>
						<input
							id="field-card"
							inputMode="numeric"
							autoComplete="off"
							value={values.card}
							onChange={(event) => setField('card', event.target.value)}
							aria-invalid={Boolean(errors.card)}
							aria-describedby={errors.card ? 'error-card' : undefined}
						/>
						{errors.card ? (
							<span className="status error" id="error-card">
								{errors.card}
							</span>
						) : null}
					</div>
					<div className="field">
						<label htmlFor="field-expiry">Срок действия (ММ/ГГ)</label>
						<input
							id="field-expiry"
							inputMode="numeric"
							placeholder="12/29"
							autoComplete="off"
							value={values.expiry}
							onChange={(event) => setField('expiry', event.target.value)}
							aria-invalid={Boolean(errors.expiry)}
							aria-describedby={errors.expiry ? 'error-expiry' : undefined}
						/>
						{errors.expiry ? (
							<span className="status error" id="error-expiry">
								{errors.expiry}
							</span>
						) : null}
					</div>
					<div className="field">
						<label htmlFor="field-cvc">CVC</label>
						<input
							id="field-cvc"
							inputMode="numeric"
							autoComplete="off"
							value={values.cvc}
							onChange={(event) => setField('cvc', event.target.value)}
							aria-invalid={Boolean(errors.cvc)}
							aria-describedby={errors.cvc ? 'error-cvc' : undefined}
						/>
						{errors.cvc ? (
							<span className="status error" id="error-cvc">
								{errors.cvc}
							</span>
						) : null}
					</div>
				</fieldset>

				<div aria-live="polite" role="status">
					{payment.status === 'submitting' ? <p className="status info">Проводим оплату. Не закрывайте страницу.</p> : null}
					{payment.status === 'failed' ? <p className="status error">Оплата не прошла: {payment.error}</p> : null}
					{payment.status === 'cancelled'