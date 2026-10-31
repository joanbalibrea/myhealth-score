import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfileService } from '../src/profile-persistence.js';
function fixture({ user = { id: 'verified' }, updateError = null, uploadError = null } = {}) {
  const calls = [];
  let row = { id: 'verified', username: 'Ada', avatar_path: 'verified/old.png' };
  const client = {
    auth: { async getUser() { return { data: { user }, error: null }; } },
    from(table) {
      calls.push(['table', table]);
      let changes;
      const query = {
        select() { return query; },
        update(value) { changes = value; calls.push(['update', value]); return query; },
        eq(column, id) { calls.push(['filter', column, id]); return query; },
        async single() {
          if (changes && updateError) return { error: updateError };
          if (changes) row = { ...row, ...changes };
          return { data: { ...row }, error: null };
        },
      };
      return query;
    },
    storage: { from(bucket) {
      assert.equal(bucket, 'avatars');
      return {
        async upload(path, file, options) { calls.push(['upload', path, options]); return { error: uploadError }; },
        async remove(paths) { calls.push(['remove', paths]); return { error: null }; },
        async createSignedUrl(path, seconds) { calls.push(['sign', path, seconds]); return { data: { signedUrl: 'https://signed.example/temporary' } }; },
      };
    } },
  };
  return { ...createProfileService(client), calls };
}
const image = { type: 'image/png', size: 100 };
test('profile read and trimmed username update filter by authenticated UUID', async () => {
  const f = fixture();
  assert.equal((await f.getProfile()).username, 'Ada');
  assert.equal((await f.updateUsername('  New name  ')).username, 'New name');
  assert.deepEqual(f.calls.filter(([kind]) => kind === 'filter'), [['filter', 'id', 'verified'], ['filter', 'id', 'verified']]);
  await assert.rejects(f.updateUsername('  '), /enter a username/);
  const anonymous = fixture({ user: null });
  await assert.rejects(anonymous.getProfile(), /sign in/);
  await assert.rejects(anonymous.updateUsername('Name'), /sign in/);
  await assert.rejects(anonymous.uploadAvatar(image), /sign in/);
  assert.deepEqual(anonymous.calls, []);
});
test('avatar replacement uploads unique owned path, saves path, then removes old file', async () => {
  const f = fixture();
  const first = await f.uploadAvatar(image);
  assert.match(first.avatar_path, /^verified\/avatar-[\da-f-]+\.png$/);
  const mutations = f.calls.filter(([kind]) => ['upload', 'update', 'remove'].includes(kind));
  assert.deepEqual(mutations.map(([kind]) => kind), ['upload', 'update', 'remove']);
  assert.deepEqual(mutations[1][1], { avatar_path: first.avatar_path });
  assert.deepEqual(mutations[2][1], ['verified/old.png']);
  const second = await f.uploadAvatar(image);
  assert.notEqual(first.avatar_path, second.avatar_path);
});
test('upload failure keeps old profile; profile failure removes only new orphan', async () => {
  const upload = fixture({ uploadError: { message: 'offline' } });
  await assert.rejects(upload.uploadAvatar(image), /could not be uploaded/);
  assert.ok(!upload.calls.some(([kind]) => ['update', 'remove'].includes(kind)));
  const update = fixture({ updateError: { message: 'database offline' } });
  await assert.rejects(update.uploadAvatar(image), /could not be saved/);
  const path = update.calls.find(([kind]) => kind === 'upload')[1];
  assert.deepEqual(update.calls.find(([kind]) => kind === 'remove')[1], [path]);
});
test('invalid image types and oversized files are rejected before storage access', async () => {
  const f = fixture();
  await assert.rejects(f.uploadAvatar({ type: 'text/plain', size: 20 }), /JPEG/);
  await assert.rejects(f.uploadAvatar({ type: 'image/png', size: 6 * 1024 * 1024 }), /5 MB/);
  assert.deepEqual(f.calls, []);
});
test('private signing rejects another user path and uses one hour expiry', async () => {
  const f = fixture();
  await assert.rejects(f.getAvatarUrl('other/avatar.png'), /Invalid/);
  assert.equal(await f.getAvatarUrl(null), '');
  assert.equal(await f.getAvatarUrl('verified/old.png'), 'https://signed.example/temporary');
  assert.deepEqual(f.calls, [['sign', 'verified/old.png', 3600]]);
});
test('default avatar clears stored path before deleting previous image', async () => {
  const f = fixture();
  assert.equal((await f.removeAvatar()).avatar_path, null);
  assert.deepEqual(f.calls.filter(([kind]) => ['update', 'remove'].includes(kind)), [['update', { avatar_path: null }], ['remove', ['verified/old.png']]]);
});
