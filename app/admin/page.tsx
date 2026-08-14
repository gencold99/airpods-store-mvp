import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Admin — Bright Future',
	robots: { index: false, follow: false },
};

const sections = [
	'Dashboard',
	'Products',
	'Categories',
	'Inventory',
	'Orders',
	'Promocodes',
	'Reviews',
	'Content',
	'Delivery',
	'Analytics',
	'Settings',
];

/**
 * Frontend-прототип, а не рабочая панель. Доступ в production закрыт middleware
 * (см. lib/admin.ts): без реальной авторизации открывать его наружу нельзя.
 */
export default function Admin() {
	return (
		<main className="container" id="main" tabIndex={-1}>
			<div className="page-header">
				<div className="eyebrow">Frontend prototype</div>
				<h1>Admin workspace</h1>
				<p className="status warn">
					Prototype / mock. Это не production-админка: авторизации нет, данные не сохраняются, в production маршрут закрыт.
				</p>
				<p className="lead">Каркас разделов будущей панели управления магазином.</p>
			</div>
			<div className="grid">
				{sections.map((section, index) => (
					<div className="card" key={section}>
						<div className="eyebrow">0{index + 1}</div>
						<h2>{section}</h2>
						<p className="muted">Mock — без реальных данных</p>
					</div>
				))}
			</div>
		</main>
	);
}
