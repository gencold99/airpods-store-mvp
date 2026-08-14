'use client';

import { useState } from 'react';
import type { ProductMediaSlot } from '@/lib/domain';

const FALLBACK: ProductMediaSlot = { id: 'main', label: 'Основное фото', src: null };

/**
 * Media rail + main stage. Фотографий пока нет, поэтому слоты подписаны честно:
 * как слоты, а не как конкретный кадр, который мы не можем подтвердить.
 */
export default function ProductGallery({
	name,
	initials,
	slots,
}: {
	name: string;
	initials: string;
	slots: ProductMediaSlot[];
}) {
	const list = slots.length > 0 ? slots : [FALLBACK];
	const [activeIndex, setActiveIndex] = useState(0);
	const active = list[Math.min(activeIndex, list.length - 1)];

	return (
		<div className="gallery">
			<figure className="gallery-stage">
				{active.src ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img src={active.src} alt={`${name} — ${active.label}`} />
				) : (
					<div
						className="gallery-placeholder"
						role="img"
						aria-label={`${name}: слот изображения «${active.label}». Фотографии подключаются вместе с товарными данными.`}
					>
						<span aria-hidden="true">{initials}</span>
					</div>
				)}
				<figcaption className="muted">{active.label}</figcaption>
			</figure>

			{list.length > 1 ? (
				<ul className="gallery-rail" aria-label={`Изображения: ${name}`}>
					{list.map((slot, index) => (
						<li key={slot.id}>
							<button
								className="gallery-thumb"
								type="button"
								aria-pressed={index === activeIndex}
								onClick={() => setActiveIndex(index)}
							>
								<span aria-hidden="true">{initials}</span>
								<span className="visually-hidden">{slot.label}</span>
							</button>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}
