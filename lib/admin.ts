/**
 * `/admin` is an unauthenticated frontend mock.
 *
 * `robots: { index: false }` only asks crawlers to stay away — it does not stop
 * anyone from opening the URL — so the route is denied by default in a production
 * deployment and has to be opted into explicitly with `ADMIN_PREVIEW_ENABLED=true`.
 * Local development stays open so the panel remains reviewable.
 *
 * This is a deployment guard, not authentication. Replace it with real auth before
 * the panel is allowed to read or write anything real.
 */
export function isAdminPreviewEnabled(env: Record<string, string | undefined> = process.env): boolean {
	// Strict opt-in: only the exact string 'true' opens the route.
	if (env.ADMIN_PREVIEW_ENABLED === 'true') return true;
	return env.NODE_ENV !== 'production';
}
