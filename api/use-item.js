const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_OWNER_ID = process.env.TELEGRAM_OWNER_ID;

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({error:'Method not allowed'});
  }

  try {
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    if (!body?.telegramId || !body?.itemId) {
      return response.status(400).json({error:'Invalid item data'});
    }
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_OWNER_ID) {
      return response.status(500).json({error:'Telegram settings are missing'});
    }

    const filters = body.purchaseId
      ? `id=eq.${encodeURIComponent(body.purchaseId)}`
      : `telegram_id=eq.${encodeURIComponent(String(body.telegramId))}&item_id=eq.${encodeURIComponent(body.itemId)}&used_at=is.null&order=purchased_at.asc`;
    const findResult = await fetch(
      `${SUPABASE_URL}/rest/v1/purchases?${filters}&select=id,title&limit=1`,
      {headers:supabaseHeaders()}
    );
    if (!findResult.ok) throw new Error(await findResult.text());
    const purchases = await findResult.json();
    const purchase = purchases[0];
    if (!purchase) return response.status(409).json({error:'Item already used or not found'});

    const message = `я использовала предмет "${purchase.title}"`;
    const telegramResult = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({chat_id:TELEGRAM_OWNER_ID, text:message})
    });
    if (!telegramResult.ok) throw new Error(await telegramResult.text());

    const updateResult = await fetch(`${SUPABASE_URL}/rest/v1/purchases?id=eq.${encodeURIComponent(purchase.id)}`, {
      method:'PATCH',
      headers:{...supabaseHeaders(), 'Content-Type':'application/json', Prefer:'return=minimal'},
      body:JSON.stringify({used_at:new Date().toISOString()})
    });
    if (!updateResult.ok) throw new Error(await updateResult.text());
    return response.status(200).json({ok:true});
  } catch (error) {
    console.error(error);
    return response.status(500).json({error:'Unable to use item'});
  }
}

function supabaseHeaders() {
  return {apikey:SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}`};
}