'use client';

import { useId, useState } from 'react';
import { analytics } from '@/lib/analytics';
import { quoteRepository } from '@/lib/repositories';
import type { Product } from '@/lib/domain';

type Status = 'idle' | 'sending' | 'sent' | 'error';

/**
 * Товар без известной цены нельзя положить в корзину, поэтому воронка не должна
 * заканчиваться тупиком: заявка уходит через quoteRepository (сейчас mock).
 */
export default function PriceRequestForm({ product }: { product: Product }) {
	const nameId = useId();
	const contactId = useId();
	const commentId = useId();
	const [values, setValues] = useState({ name: '', contact: '', comment: '' });
	const [status, setStatus] = useState<Status>('idle');
	const [message, setMessage] = useState('');

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (status === 'sending') return;

		if (values.contact.trim().length < 5) {
			setStatus('error');
			setMessage('Укажите телефон или email, чтобы менеджер мог ответить.');
			document.getElementById(contactId)?.focus();
			return;
		}

		setStatus('sending');
		const result = await quoteRepository.create({
			productId: product.id,
			productName: product.name,
			name: values.name,
			contact: values.contact,
			comment: values.comment,
		});

		if (!result.ok) {
			setStatus('error');
			setMessage(result.error);
			return;
		}

		analytics.track({ name: 'price_request', productId: product.id });
		setStatus('sent');
		setMessage(
			`Заявка ${result.data.id} сформирована. Отправка менеджеру подключается вместе с backend — пока данные не покидают устройство.`,
		);
	}

	if (status === 'sent') {
		return (
			<div className="card">
				<p className="status ok" role="status" aria-live="polite">
					{message}
				</p>
			</div>
		);
	}

	return (
		<form className="card form" onSubmit={onSubmit} noValidate>
			<div className="field">
				<label htmlFor={nameId}>Как к вам обращаться</label>
				<input
					id={nameId}
					name="name"
					autoComplete="name"
					value={values.name}
					onChange={(event) => setValues((previous) => ({ ...previous, name: event.target.value }))}
				/>
			</div>
			<div className="field">
				<label htmlFor={contactId}>Телефон или email</label>
				<input
					id={contactId}
					name="contact"
					autoComplete="tel"
					value={values.contact}
					aria-invalid={status === 'error' ? true : undefined}
					onChange={(event) => setValues((previous) => ({ ...previous, contact: event.target.value }))}
				/>
			</div>
			<div className="field">
				<label htmlFor={commentId}>Комментарий</label>
				<input
					id={commentId}
					name="comment"
					value={values.comment}
					onChange={(event) => setValues((previous) => ({ ...previous, comment: event.target.value }))}
				/>
			</div>
			<button className="button accent" type="submit" disabled={status === 'sending'} aria-busy={status === 'sending'}>
				{status === 'sending' ? 'Отправляем…' : 'Отправить заявку'}
			</button>
			<p className={status === 'error' ? 'status error' : 'status info'} role="status" aria-live="polite">
				{message || `Ответим по цене и наличию: ${product.name}.`}
			</p>
		</form>
	);
}
