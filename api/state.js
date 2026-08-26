const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({
      error: 'Method not allowed'
    });
  }

  const telegramId = request.query.telegram_id;

  if (!telegramId) {
    return response.status(400).json({
      error: 'telegram_id is required'
    });
  }

  try {
    const url =
      `${SUPABASE_URL}/rest/v1/players` +
      `?telegram_id=eq.${encodeURIComponent(telegramId)}` +
      '&select=*';

    const result = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!result.ok) {
      const errorText = await result.text();
      console.error(errorText);

      return response.status(500).json({
        error: 'Supabase request failed'
      });
    }

    const players = await result.json();

    return response.status(200).json({
      player: players[0] || null
    });
  } catch (error) {
    console.error(error);

    return response.status(500).json({
      error: 'Server error'
    });
  }
}