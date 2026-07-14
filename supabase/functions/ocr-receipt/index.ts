// Supabase Edge Function: OCR a KakaoBank deposit-notification screenshot into
// { memberName, amount, occurredAt } using Naver CLOVA OCR (spec section 9).
// Deploy: supabase functions deploy ocr-receipt
// Secrets: supabase secrets set CLOVA_OCR_API_URL=... CLOVA_OCR_SECRET_KEY=...
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface OcrResult {
  memberName: string;
  amount: number;
  occurredAt: string;
}

function parseClovaFields(fields: { inferText: string }[]): OcrResult {
  const text = fields.map((f) => f.inferText).join(' ');

  const amountMatch = text.match(/([0-9][0-9,]{3,})\s*원/);
  const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : 0;

  const nameMatch = text.match(/([가-힣]{2,4})\s*(님|고객)?\s*(입금|송금)/);
  const memberName = nameMatch ? nameMatch[1] : '';

  const dateMatch = text.match(/(\d{2,4}[.\-/]\d{1,2}[.\-/]\d{1,2})/);
  const occurredAt = dateMatch ? new Date(dateMatch[1].replace(/\./g, '-')).toISOString() : new Date().toISOString();

  return { memberName, amount, occurredAt };
}

Deno.serve(async (req) => {
  try {
    const { path } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: signedUrl, error: signError } = await supabase.storage
      .from('dues-receipts')
      .createSignedUrl(path, 60);
    if (signError) throw signError;

    const clovaUrl = Deno.env.get('CLOVA_OCR_API_URL')!;
    const clovaSecret = Deno.env.get('CLOVA_OCR_SECRET_KEY')!;

    const ocrResponse = await fetch(clovaUrl, {
      method: 'POST',
      headers: { 'X-OCR-SECRET': clovaSecret, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: 'V2',
        requestId: crypto.randomUUID(),
        timestamp: Date.now(),
        images: [{ format: 'jpg', name: 'receipt', url: signedUrl.signedUrl }],
      }),
    });

    if (!ocrResponse.ok) {
      throw new Error(`CLOVA OCR request failed: ${ocrResponse.status}`);
    }

    const ocrJson = await ocrResponse.json();
    const fields = ocrJson.images?.[0]?.fields ?? [];
    const result = parseClovaFields(fields);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
