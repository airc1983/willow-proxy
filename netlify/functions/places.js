// ══════════════════════════════════════════════════════════════
// Willow — Google Places Proxy
// Netlify serverless function
//
// Keeps your API key server-side. Handles CORS.
//
// Endpoints (Netlify rewrites these via netlify.toml):
//   GET /api/places?q=gluten+free+Norwich&dietary=gluten+free
//   GET /api/details?place_id=ChIJxxx
// ══════════════════════════════════════════════════════════════

const https = require('https');

const GOOGLE_KEY = process.env.GOOGLE_API_KEY;

// ── Add your deployed Netlify URL to this list ────────────────
const ALLOWED_ORIGINS = [
  'https://willowapp.netlify.app', // ← update to your subdomain
  'http://localhost:3000',
  'http://127.0.0.1:5500',
  'null'
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': '*', // tighten this once in production
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse Google response')); }
      });
    }).on('error', reject);
  });
}

async function fetchPlaceDetails(placeId) {
  const fields = [
    'place_id','name','formatted_address','formatted_phone_number',
    'website','rating','user_ratings_total','opening_hours',
    'reviews','photos','geometry','editorial_summary','types','vicinity'
  ].join(',');

  const url = `https://maps.googleapis.com/maps/api/place/details/json`
    + `?place_id=${encodeURIComponent(placeId)}`
    + `&fields=${fields}`
    + `&reviews_sort=most_relevant`
    + `&key=${GOOGLE_KEY}`;

  const data = await fetchUrl(url);
  if (data.status !== 'OK') return { place_id: placeId, name: 'Venue', _error: data.status };

  const p = data.result;
  return {
    place_id: p.place_id,
    name: p.name,
    formatted_address: p.formatted_address || p.vicinity,
    formatted_phone_number: p.formatted_phone_number || '',
    website: p.website || '',
    rating: p.rating || null,
    user_ratings_total: p.user_ratings_total || 0,
    opening_hours: p.opening_hours ? {
      open_now: p.opening_hours.open_now,
      weekday_text: p.opening_hours.weekday_text || []
    } : null,
    reviews: (p.reviews || []).slice(0, 5).map(r => ({
      author_name: r.author_name,
      rating: r.rating,
      text: r.text,
      relative_time_description: r.relative_time_description
    })),
    photo_references: (p.photos || []).slice(0, 4).map(ph => ph.photo_reference),
    geometry: p.geometry || null,
    editorial_summary: p.editorial_summary || null,
    types: p.types || []
  };
}

exports.handler = async (event) => {
  const origin = event.headers.origin || '';
  const headers = corsHeaders(origin);

  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (!GOOGLE_KEY) {
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: 'GOOGLE_API_KEY env variable not set on Netlify' })
    };
  }

  const params = event.queryStringParameters || {};
  const path = event.path || '';

  try {
    // ── /api/places ───────────────────────────────────────────
    if (path.includes('places')) {
      const query = params.q || 'gluten free restaurant Norwich';

      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json`
        + `?query=${encodeURIComponent(query)}`
        + `&location=52.6309,1.2974`
        + `&radius=3000`
        + `&key=${GOOGLE_KEY}`;

      const searchData = await fetchUrl(searchUrl);

      if (!['OK','ZERO_RESULTS'].includes(searchData.status)) {
        return {
          statusCode: 502, headers,
          body: JSON.stringify({ error: searchData.status, message: searchData.error_message || '' })
        };
      }

      const places = (searchData.results || []).slice(0, 7);
      const detailed = await Promise.all(places.map(p => fetchPlaceDetails(p.place_id)));

      return {
        statusCode: 200, headers,
        body: JSON.stringify({ results: detailed })
      };
    }

    // ── /api/details ──────────────────────────────────────────
    if (path.includes('details')) {
      if (!params.place_id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'place_id required' }) };
      }
      const detail = await fetchPlaceDetails(params.place_id);
      return { statusCode: 200, headers, body: JSON.stringify(detail) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Unknown endpoint' }) };

  } catch (err) {
    console.error('Willow proxy error:', err);
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: 'Proxy error', message: err.message })
    };
  }
};
