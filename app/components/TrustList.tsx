import type { TrustSignal } from '@/lib/config';

/**
 * Единственное место, где рисуются обещания магазина.
 *
 * Сигнал со статусом 'pending' — это ещё не обещание, а намерение: показывать его
 * так же, как подтверждённый, значит вводить покупателя в заблуждение. Поэтому маркер
 * рендерится из данных, а не добавляется руками на каждой странице отдельно.
 */
export default function TrustList({
	signals,
	label,
}: {
	signals: TrustSignal[];
	label?: string;
}) {
	if (signals.length === 0) return null;

	return (
		<ul className="reassurance" aria-label={label}>
			{signals.map((signal) => (
				<li key={signal.id}>
					<strong>{signal.title}</strong>
					{signal.status === 'pending' ? (
						<span className="chip trust-pending">
							<span aria-hidden="true">Уточняется</span>
							<span className="visually-hidden">условия ещё не подтверждены</span>
						</span>
					) : null}
					<span className="muted"> {signal.text}</span>
				</li>
			))}
		</ul>
	);
}
