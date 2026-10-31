// Injectable client keeps profile operations independently testable.
export function createProfileService(client) {
  const columns = 'id, username, avatar_path, created_at';
  async function userId() {
    const { data, error } = await client.auth.getUser();
    if (error) throw new Error('Unable to verify your session. Please sign in again.', { cause: error });
    if (!data?.user?.id) throw new Error('Please sign in before accessing your profile.');
    return data.user.id;
  }
  function failure(message, error) { return new Error(message, { cause: error }); }
  async function read(id) {
    const { data, error } = await client.from('profiles').select(columns).eq('id', id).single();
    if (error || !data) throw failure('Your profile could not be loaded. Please try again.', error);
    return data;
  }
  async function update(id, changes) {
    const { data, error } = await client.from('profiles').update(changes).eq('id', id).select(columns).single();
    if (error || !data) throw failure('Your profile could not be saved. Please try again.', error);
    return data;
  }
  function ownPath(path, id) {
    if (typeof path !== 'string' || path.split('/')[0] !== id || path.split('/').length !== 2 || !path.split('/')[1] || path.includes('..')) {
      throw new Error('Invalid profile image path.');
    }
  }
  async function cleanup(path, id) {
    if (!path) return;
    try {
      ownPath(path, id);
      const { error } = await client.storage.from('avatars').remove([path]);
      if (error) throw error;
    } catch (error) { console.error('Unable to remove unused avatar:', error); }
  }
  async function replaceAvatar(file) {
    const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
    if (file && !extensions[file.type]) throw new Error('Choose a JPEG, PNG, WebP, or GIF image.');
    if (file && (!file.size || file.size > 5 * 1024 * 1024)) throw new Error('Choose an image smaller than 5 MB.');
    const id = await userId();
    const previous = await read(id);
    const path = file ? `${id}/avatar-${crypto.randomUUID()}.${extensions[file.type]}` : null;
    if (file) {
      const { error } = await client.storage.from('avatars').upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw failure('Your image could not be uploaded. Please try again.', error);
    }
    let profile;
    try { profile = await update(id, { avatar_path: path }); }
    catch (error) { await cleanup(path, id); throw error; }
    if (previous.avatar_path !== path) await cleanup(previous.avatar_path, id);
    return profile;
  }
  return {
    async getProfile() { return read(await userId()); },
    async updateUsername(username) {
      const value = typeof username === 'string' ? username.trim() : '';
      if (!value) throw new Error('Please enter a username.');
      return update(await userId(), { username: value });
    },
    async getAvatarUrl(path) {
      const id = await userId();
      if (!path) return '';
      ownPath(path, id);
      const { data, error } = await client.storage.from('avatars').createSignedUrl(path, 3600);
      if (error || !data?.signedUrl) throw failure('Your profile image could not be loaded.', error);
      return data.signedUrl;
    },
    async uploadAvatar(file) {
      if (!file) throw new Error('Please choose an image.');
      return replaceAvatar(file);
    },
    async removeAvatar() { return replaceAvatar(null); },
  };
}
