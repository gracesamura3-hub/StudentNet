import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowInsightsOnProfile } from './insightsUtils.js';

test('student and alumni profiles show the My Insights card', () => {
  assert.equal(shouldShowInsightsOnProfile('student'), true);
  assert.equal(shouldShowInsightsOnProfile('alumni'), true);
});

test('business and admin profiles hide the My Insights card', () => {
  assert.equal(shouldShowInsightsOnProfile('business'), false);
  assert.equal(shouldShowInsightsOnProfile('admin'), false);
  assert.equal(shouldShowInsightsOnProfile(undefined), false);
});
