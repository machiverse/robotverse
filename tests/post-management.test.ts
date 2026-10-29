import assert from 'node:assert/strict';
import { canManagePost, postPublicationUpdate, postManagementStatus } from '../src/lib/postManagement';

assert.equal(canManagePost('owner', 'owner', 'community'), true);
assert.equal(canManagePost('owner', 'other', 'community'), false);
assert.equal(canManagePost('owner', undefined), false);
assert.equal(canManagePost('owner', 'owner', 'blog'), true);
assert.equal(postManagementStatus('draft', '2026-12-01T10:00:00Z'), 'scheduled');
assert.equal(postManagementStatus('draft', null), 'draft');
assert.deepEqual(postPublicationUpdate('save', 'draft'), { status: 'draft', is_draft: true, scheduled_publish_at: null });
const schedule = '2026-12-01T10:00:00.000Z';
assert.deepEqual(postPublicationUpdate('save', 'scheduled', schedule), { status: 'scheduled', is_draft: false, scheduled_publish_at: schedule });
assert.equal(postPublicationUpdate('save', 'published').status, 'published');
assert.equal(postPublicationUpdate('draft', 'scheduled', schedule).scheduled_publish_at, null);
assert.equal(postPublicationUpdate('publish', 'draft').status, 'published');
assert.equal(postPublicationUpdate('schedule', 'draft', null, schedule).scheduled_publish_at, schedule);
console.log('post-management ok');