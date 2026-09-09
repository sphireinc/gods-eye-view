import assert from 'node:assert/strict';
import test from 'node:test';
import { reviewCameraPack, validateCameraPack } from './cameraPackWorkbench.js';

const pack = (overrides = {}) => ({ id: 'pack-eu', contributor: 'Community', reviewContact: 'review@example.test', cameras: [{ id: 'cam-1', operator: 'City', sourcePage: 'https://city.test/cam', termsUrl: 'https://city.test/terms', lastReviewed: '2026-09-01' }], ...overrides });

test('validates reviewed camera-pack contributions', () => {
  const validated = validateCameraPack(pack());
  assert.equal(validated.status, 'PENDING_REVIEW');
  assert.equal(reviewCameraPack(pack(), { approved: true, reviewer: 'maintainer' }).status, 'APPROVED');
});

test('rejects entries without rights evidence or review dates', () => {
  assert.throws(() => validateCameraPack(pack({ cameras: [{ id: 'bad' }] })), /missing operator/);
});
