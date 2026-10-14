// Stateless proxy for the OpenXBL (xbl.io) API.
//
// Why this exists: OpenXBL sends no Access-Control-Allow-Origin header, so a
// static browser app can't call it directly. This function forwards a
// whitelisted /api/v2/* path to xbl.io with the OPENXBL_KEY secret held by the
// Worker, so the key never reaches the client and CORS is a non-issue (the
// browser calls /api/xbox on the same origin).
//
// It stores nothing — game data still lives only in the user's browser.

// Correct OpenXBL host is xbl.io (verified: /api/v2/account → 401 "API key
// required"). The api.xbl.io subdomain 404s these paths.
const BASE = 'https://xbl.io';

export async function handleXbox(url, env) {
  const key = env.OPENXBL_KEY;
  if (!key) {
    return json(503, {
      error:
        'Xbox sync is not configured: set the OPENXBL_KEY secret on the Worker.',
    });
  }

  const path = url.searchParams.get('path') ?? '';
  // Only allow read paths into the OpenXBL v2 API.
  if (!path.startsWith('/api/v2/')) {
    return json(400, { error: 'A valid /api/v2/ path is required.' });
  }

  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        'X-Authorization': key,
        Accept: 'application/json',
        // Some endpoints (e.g. title history) forward to Xbox Live's titlehub,
        // which rejects an "Accept-Language: *" — send a concrete locale.
        'Accept-Language': 'en-US',
      },
    });
    return new Response(await res.text(), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return json(502, { error: `Upstream request failed: ${String(err)}` });
  }
}

function json(status, obj) {
  return Response.json(obj, { status });
}
