const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof request.body === 'string'
      ? JSON.parse(request.body)
      : request.body;

    if (!body?.telegramId || !body?.itemId || !body?.title) {
      return response.status(400).json({ error: 'Invalid purchase data' });
    }

    if (body.itemId === 'apology_bueno1_2026_08_27') {
      const existing = await fetch(
        `${SUPABASE_URL}/rest/v1/purchases?telegram_id=eq.${encodeURIComponent(String(body.telegramId))}&item_id=eq.${encodeURIComponent(body.itemId)}&select=id&limit=1`,
        {headers: supabaseHeaders()}
      );
      if (!existing.ok) throw new Error(await existing.text());
      if ((await existing.json()).length) return response.status(200).json({ok:true, alreadyGranted:true});
    }

    const result = await fetch(`${SUPABASE_URL}/rest/v1/purchases`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        telegram_id: String(body.telegramId),
        item_id: body.itemId,
        title: body.title,
        price: Number(body.price) || 0,
        purchased_at: new Date().toISOString()
      })
    });

    if (!result.ok) {
      console.error(await result.text());
      return response.status(500).json({ error: 'Supabase request failed' });
    }

    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: 'Server error' });
  }
}

function supabaseHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`
  };
}