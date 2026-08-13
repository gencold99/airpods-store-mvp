export type Money = { amount: number | null; currency: 'RUB' };
export type ProductVariant = { id: string; label: string; sku: string; price: Money; available: boolean };
export type Product = { id: string; slug: string; name: string; tagline: string; category: string; image: string | null; price: Money; oldPrice: Money; availability: 'available' | 'unavailable' | 'placeholder'; variants: ProductVariant[]; specs: Record<string, string | null> };
export type CartItem = { productId: string; variantId: string; quantity: number };
export type Cart = { items: CartItem[]; promoCode?: string; discount: Money };
export type Order = { id: string; items: CartItem[]; total: Money; status: 'pending' | 'paid' | 'failed'; email: string };
export type RepositoryResult<T> = { ok: true; data: T } | { ok: false; error: string };
