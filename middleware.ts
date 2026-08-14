import { NextResponse } from 'next/server';
import { isAdminPreviewEnabled } from '@/lib/admin';

/**
 * Guards the unauthenticated `/admin` mock. See lib/admin.ts for the rule.
 *
 * The edge runtime inlines environment variables at build time, so
 * ADMIN_PREVIEW_ENABLED has to be present for the build, not just at runtime.
 */
export function middleware() {
	if (isAdminPreviewEnabled()) return NextResponse.next();

	// Deny rather than redirect: a redirect would confirm that the route exists.
	return new NextResponse('Not Found', {
		status: 404,
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'x-robots-tag': 'noindex, nofollow',
		},
	});
}

export const config = {
	matcher: ['/admin', '/admin/:path*'],
};
