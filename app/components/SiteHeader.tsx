'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart/CartProvider';

export default function SiteHeader({ showAdminLink = false }: { showAdminLink?: boolean }) {
	const { itemCount, hydrated } = useCart();

	return (
		<header className="header container">
			<Link className="brand" href="/">
				BRIGHT FUTURE<span className="eyebrow"> / audio</span>
			</Link>
			<nav className="nav" aria-label="Основная навигация">
				<Link href="/shop">Каталог</Link>
				<Link href="/cart">
					Корзина
					{hydrated && itemCount > 0 ? (
						<span className="cart-count" aria-hidden="true">
							{itemCount}
						</span>
					) : null}
					<span className="visually-hidden">{hydrated ? `, товаров в корзине: ${itemCount}` : ''}</span>
				</Link>
				{showAdminLink ? <Link href="/admin">Админ</Link> : null}
			</nav>
		</header>
	);
}
