import assert from 'node:assert/strict';
import test from 'node:test';
import { createPackReadmeTemplate, diagnoseCameraPack } from './cameraPackDoctor.js';
test('produces stable blocked diagnostics for malformed packs', () => { const report = diagnoseCameraPack({ cameras: [{ id: 'x', latitude: 200 }, { id: 'x' }] }); assert.equal(report.status, 'BLOCKED'); assert.ok(report.issues.some((issue) => issue.code === 'duplicate-id')); assert.ok(report.issues.some((issue) => issue.code === 'missing-pack-terms')); });
test('accepts a complete camera and supplies a contributor template', () => { const report = diagnoseCameraPack({ termsUrl: 'https://example.org/terms', cameras: [{ id: 'x', latitude: 1, longitude: 2, sourcePage: 'https://example.org', feedType: 'jpeg', attribution: 'City' }] }); assert.equal(report.status, 'PASS'); assert.match(createPackReadmeTemplate('Alps'), /# Alps/); });
