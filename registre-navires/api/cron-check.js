import { kv } from '@vercel/kv';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const THRESHOLD_DAYS = parseInt(process.env.ALERT_THRESHOLD_DAYS || '2', 10);

// REGION_EMAILS doit être un JSON du type:
// {"Casablanca-Settat":"casa-team@example.com","Tanger-Tetouan":"tanger-team@example.com"}
function getRegionEmailMap() {
  try {
    return JSON.parse(process.env.REGION_EMAILS || '{}');
  } catch (e) {
    console.error('REGION_EMAILS mal formé, JSON attendu.', e);
    return {};
  }
}

function buildDigestHtml(regionLabel, urgent, missing, now) {
  const parts = [`<p>Rappel du jour — ${regionLabel}</p>`];

  if (urgent.length) {
    parts.push('<h3 style="color:#1F5C3F;">À mandater rapidement</h3><ul>');
    for (const v of urgent) {
      const diffDays = Math.floor((new Date(v.eta) - now) / 86400000);
      const label =
        diffDays >= 0
          ? `reste ${diffDays} jour(s)`
          : `ETA dépassé de ${Math.abs(diffDays)} jour(s)`;
      const dest = v.destination ? ` — destination ${v.destination}` : '';
      parts.push(`<li><strong>${v.name}</strong>${dest} — ETA ${v.eta} — ${label} — aucune compagnie mandatée</li>`);
    }
    parts.push('</ul>');
  }

  if (missing.length) {
    parts.push('<h3 style="color:#1F5C3F;">ETA à compléter</h3><ul>');
    for (const v of missing) {
      const dest = v.destination ? ` — destination ${v.destination}` : '';
      parts.push(`<li><strong>${v.name}</strong>${dest} — aucune date ETA renseignée pour le moment</li>`);
    }
    parts.push('</ul>');
  }

  return parts.join('\n');
}

export default async function handler(req, res) {
  const vessels = (await kv.get('vessels')) || [];
  const now = new Date();
  const regionEmails = getRegionEmailMap();
  const fallbackEmail = process.env.ALERT_EMAIL_TO;

  const missingEta = vessels.filter((v) => !v.eta && !v.company);
  const urgent = vessels.filter((v) => {
    if (!v.eta || v.company) return false;
    const diffDays = (new Date(v.eta) - now) / 86400000;
    return diffDays <= THRESHOLD_DAYS;
  });

  if (missingEta.length === 0 && urgent.length === 0) {
    return res.status(200).json({ sent: false, reason: 'Rien à signaler aujourd’hui.' });
  }

  // Regrouper par région (les navires sans région vont dans le lot "non assigné")
  const byRegion = {};
  for (const v of [...urgent, ...missingEta]) {
    const key = v.region || '__unassigned__';
    if (!byRegion[key]) byRegion[key] = { urgent: [], missing: [] };
    if (urgent.includes(v)) byRegion[key].urgent.push(v);
    if (missingEta.includes(v)) byRegion[key].missing.push(v);
  }

  const results = [];

  for (const [region, group] of Object.entries(byRegion)) {
    const isUnassigned = region === '__unassigned__';
    const to = isUnassigned ? fallbackEmail : (regionEmails[region] || fallbackEmail);

    if (!to) {
      results.push({ region, sent: false, reason: 'Aucune adresse email configurée pour cette région.' });
      continue;
    }

    const label = isUnassigned ? 'Région non renseignée' : region;
    const html = buildDigestHtml(label, group.urgent, group.missing, now);

    try {
      await resend.emails.send({
        from: process.env.ALERT_EMAIL_FROM,
        to,
        subject: `Registre inspections — rappel du jour (${label})`,
        html,
      });
      results.push({ region: label, sent: true, to, urgent: group.urgent.length, missing: group.missing.length });
    } catch (err) {
      console.error('Erreur envoi email pour', region, err);
      results.push({ region: label, sent: false, error: String(err) });
    }
  }

  return res.status(200).json({ results });
}
