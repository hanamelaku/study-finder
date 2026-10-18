const { nanoid } = require('nanoid');
const Profile = require('../models/profile.model');
const Unlock = require('../models/unlock.model');

exports.createProfile = async (req, res) => {
  const b = req.body;
  if (!b.full_name || !b.phone) {
    return res.status(400).json({ error: 'name and phone required' });
  }
  const id = nanoid(6).toUpperCase();
  const edit_token = nanoid(12);
  await Profile.create({ ...b, id, edit_token });

  res.json({
    id,
    edit_token,
    profile_url: `/#profile/${id}`,
    edit_url: `/#edit/${edit_token}`
  });
};

exports.listProfiles = async (req, res) => {
  const list = await Profile.list(req.query);
  res.json(list);
};

exports.getProfile = async (req, res) => {
  const p = await Profile.findById(req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });

  const access = req.query.access;
  const unlocked = access ? await Unlock.hasPaid(p.id, access) : false;

  const safe = { ...p };
  delete safe.edit_token;
  if (!unlocked) {
    delete safe.phone;
    delete safe.email;
  }
  res.json({ ...safe, unlocked });
};

exports.getProfileByToken = async (req, res) => {
  const p = await Profile.findByToken(req.params.token);
  if (!p) return res.status(404).json({ error: 'not found' });
  res.json(p);
};

exports.updateProfile = async (req, res) => {
  const ok = await Profile.updateByToken(req.params.token, req.body);
  if (!ok) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
};

exports.deactivateProfile = async (req, res) => {
  await Profile.deactivate(req.params.token);
  res.json({ ok: true });
};