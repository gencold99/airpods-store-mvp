import './globals.css';
import Link from 'next/link';
export const metadata={title:'Bright Future — AirPods',description:'Независимый premium-магазин AirPods для российского рынка.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <><header className="header container"><Link className="brand" href="/">BRIGHT FUTURE<span className="eyebrow"> / audio</span></Link><nav className="nav" aria-label="Основная навигация"><Link href="/shop">Каталог</Link><Link href="/cart">Корзина</Link><Link href="/admin">Админ</Link></nav></header>{children}<footer className="footer"><div className="container">Bright Future · Данные и коммерческие условия настраиваются перед запуском.</div></footer></>}
