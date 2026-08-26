const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(request, response) {
  if (!['GET', 'POST'].includes(request.method)) {
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
    const playerUrl =
      `${SUPABASE_URL}/rest/v1/players` +
      `?telegram_id=eq.${encodeURIComponent(telegramId)}` +
      '&select=*';

    if (request.method === 'GET') {
      const [playerResult, purchasesResult] = await Promise.all([
        fetch(playerUrl, { headers: supabaseHeaders() }),
        fetch(
          `${SUPABASE_URL}/rest/v1/purchases?telegram_id=eq.${encodeURIComponent(telegramId)}&select=*&order=purchased_at.desc`,
          { headers: supabaseHeaders() }
        )
      ]);

      if (!playerResult.ok || !purchasesResult.ok) {
        throw new Error('Supabase read failed');
      }

      const players = await playerResult.json();
      const purchases = await purchasesResult.json();

      return response.status(200).json({
        player: players[0] || null,
        purchases
      });
    }

    const body = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;
    const player = body?.player;

    if (!player) {
      return response.status(400).json({ error: 'player is required' });
    }

    const result = await fetch(`${SUPABASE_URL}/rest/v1/players`, {
      method: 'POST',
      headers: {
        ...supabaseHeaders(),
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        telegram_id: telegramId,
        hearts: Number(player.hearts) || 0,
        balls_left: Number(player.ballsLeft) || 0,
        last_play_date: player.lastPlayDate || null,
        streak_day: Number(player.streakDay) || 0,
        bonus_hits: Number(player.bonusHits) || 0,
        updated_at: new Date().toISOString()
      })
    });

    if (!result.ok) {
      const errorText = await result.text();
      console.error(errorText);

      return response.status(500).json({
        error: 'Supabase request failed'
      });
    }

    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);

    return response.status(500).json({
      error: 'Server error'
    });
  }
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`
  };
}