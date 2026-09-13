import { Redis } from '@upstash/redis';

const kv = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const vessels = (await kv.get('vessels')) || [];
    return res.status(200).json(vessels);
  }

  if (req.method === 'POST') {
    const { name, eta, company, destination, region } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Le nom du navire est requis.' });
    }
    const vessels = (await kv.get('vessels')) || [];
    const vessel = {
      id: 'v' + Date.now() + Math.random().toString(36).slice(2, 7),
      name: name.trim(),
      eta: eta || null,
      destination: (destination || '').trim(),
      region: (region || '').trim(),
      company: (company || '').trim(),
      createdAt: new Date().toISOString(),
    };
    vessels.push(vessel);
    await kv.set('vessels', vessels);
    return res.status(201).json(vessel);
  }

  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id requis.' });
    const vessels = (await kv.get('vessels')) || [];
    const idx = vessels.findIndex((v) => v.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Navire introuvable.' });
    vessels[idx] = { ...vessels[idx], ...updates };
    await kv.set('vessels', vessels);
    return res.status(200).json(vessels[idx]);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    let vessels = (await kv.get('vessels')) || [];
    vessels = vessels.filter((v) => v.id !== id);
    await kv.set('vessels', vessels);
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  return res.status(405).end('Méthode non autorisée');
}
