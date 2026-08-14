import { describe, expect, it } from 'vitest';
import { isAdminPreviewEnabled } from './admin';

describe('isAdminPreviewEnabled', () => {
	it('keeps the mock panel reachable while developing', () => {
		expect(isAdminPreviewEnabled({ NODE_ENV: 'development' })).toBe(true);
		expect(isAdminPreviewEnabled({ NODE_ENV: 'test' })).toBe(true);
	});

	it('denies the unauthenticated panel in production by default', () => {
		expect(isAdminPreviewEnabled({ NODE_ENV: 'production' })).toBe(false);
	});

	it('opens it in production only for an explicit opt-in', () => {
		expect(isAdminPreviewEnabled({ NODE_ENV: 'production', ADMIN_PREVIEW_ENABLED: 'true' })).toBe(true);
	});

	it('treats every other value as denied, so a typo cannot expose the panel', () => {
		expect(isAdminPreviewEnabled({ NODE_ENV: 'production', ADMIN_PREVIEW_ENABLED: '1' })).toBe(false);
		expect(isAdminPreviewEnabled({ NODE_ENV: 'production', ADMIN_PREVIEW_ENABLED: 'TRUE' })).toBe(false);
		expect(isAdminPreviewEnabled({ NODE_ENV: 'production', ADMIN_PREVIEW_ENABLED: 'yes' })).toBe(false);
		expect(isAdminPreviewEnabled({ NODE_ENV: 'production', ADMIN_PREVIEW_ENABLED: '' })).toBe(false);
	});
});
