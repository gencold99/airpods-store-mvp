'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Общий modal-слой для quick view и мобильного drawer фильтров.
 * Собственная реализация вместо библиотеки: нужны только focus trap, Escape,
 * возврат фокуса и блокировка скролла — это дешевле любой зависимости.
 */
export default function Overlay({
	open,
	onClose,
	titleId,
	label,
	variant = 'modal',
	children,
}: {
	open: boolean;
	onClose: () => void;
	titleId?: string;
	label?: string;
	variant?: 'modal' | 'sheet';
	children: ReactNode;
}) {
	const panelRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!open) return;

		const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		const panel = panelRef.current;
		const target = panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel;
		target?.focus();

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		return () => {
			document.body.style.overflow = previousOverflow;
			// Фокус возвращается туда, откуда слой был открыт.
			opener?.focus();
		};
	}, [open]);

	const onKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLDivElement>) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				onClose();
				return;
			}
			if (event.key !== 'Tab') return;

			const panel = panelRef.current;
			if (!panel) return;
			const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
			if (nodes.length === 0) return;

			const first = nodes[0];
			const last = nodes[nodes.length - 1];
			if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			} else if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			}
		},
		[onClose],
	);

	if (!open) return null;

	return (
		<div
			className={`overlay overlay-${variant}`}
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<div
				className="overlay-panel"
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-label={label}
				tabIndex={-1}
				ref={panelRef}
				onKeyDown={onKeyDown}
			>
				{children}
			</div>
		</div>
	);
}
