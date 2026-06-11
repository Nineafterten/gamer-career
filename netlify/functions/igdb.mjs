// Stateless proxy for the IGDB API (https://api.igdb.com/v4), authenticated with
// Twitch app credentials held server-side.
//
// Why this exists: IGDB requires a Twitch OAuth app token and sends no CORS
// header, so a static browser app can't call it directly. This function holds the
// TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET, mints + caches an app access token, and
// runs a search the browser asks for (same-origin via the /api/igdb redirect). It
// stores nothing — game data still lives only in the user's browser.

const IGDB_URL = 'https://api.igdb.com/v4/games';
const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';

// Cached app token (per warm function instance). Twitch tokens last ~60 days.
let cachedToken = null; // { token, expiresAt }

async function getToken(clientId, clientSecret) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }
  const res = await fetch(
    `${TOKEN_URL}?client_id=${encodeURIComponent(clientId)}` +
      `&client_secret=${encodeURIComponent(clientSecret)}&grant_type=client_credentials`,
    { method: 'POST' },
  );
  if (!res.ok) throw new Error(`Twitch token request failed (${res.status}).`);
  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  };
  return cachedToken.token;
}

export async function handler(event) {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return json(503, {
      error:
        'IGDB scores are not configured: set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET on the site.',
    });
  }

  const query = (event.queryStringParameters?.q ?? '').trim();
  if (!query) return json(400, { error: 'A search query (q) is required.' });

  try {
    const token = await getToken(clientId, clientSecret);
    // Strip double-quotes so the title can't break out of the Apicalypse string.
    const safe = query.replace(/"/g, '');
    const body =
      `search "${safe}"; ` +
      'fields name,rating,rating_count,aggregated_rating,aggregated_rating_count; limit 5;';
    const res = await fetch(IGDB_URL, {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body,
    });
    const text = await res.text();
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: text,
    };
  } catch (err) {
    return json(502, { error: `IGDB request failed: ${String(err)}` });
  }
}

function json(statusCode, obj) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obj),
  };
}
