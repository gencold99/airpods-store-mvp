import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/lib/cart/CartProvider';
import SiteHeader from './components/SiteHeader';
import { siteConfig } from '@/lib/config';

export const metadata: Metadata = {
	metadataBase: new URL(siteConfig.baseUrl),
	title: {
		default: 'Bright Future — магазин AirPods',
		template: '%s — Bright Future',
	},
	description: 'Витрина AirPods с прозрачным расчётом заказа и гостевым оформлением.',
	openGraph: {
		type: 'website',
		locale: siteConfig.locale,
		siteName: siteConfig.name,
	},
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ru">
			<body>
				<CartProvider>
					<a className="skip-link" href="#main">
						Перейти к основному содержимому
					</a>
					<SiteHeader />
					{children}
					<footer className="footer">
						<div className="container">
							© {new Date().getFullYear()} Bright Future. Цены, наличие и условия доставки подтверждаются перед запуском.
						</div>
					</footer>
				</CartProvider>
			</body>
		</html>
	);
}
