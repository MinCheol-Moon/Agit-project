// Supabase Edge Function: fan out an Expo push notification to members.
// Deploy: supabase functions deploy send-push
// Body: { type: 'deposit_reminder' | 'new_schedule' | 'signup_approved' | 'signup_rejected' | 'tier_changed' | 'chat_mention',
//         amount?: number, userId?: string, message?: string }
import { createClient } from 'jsr:@supabase/supabase-js@2';

const MESSAGES: Record<string, (body: Record<string, unknown>) => { title: string; body: string }> = {
  deposit_reminder: (b) => ({ title: '아지트 회비 납부일', body: `이번 달 회비 ${Number(b.amount).toLocaleString()}원을 입금해주세요.` }),
  new_schedule: (b) => ({ title: '새 일정 등록', body: `${b.title} 일정이 등록되었습니다.` }),
  signup_approved: () => ({ title: '가입 승인', body: '아지트 가입이 승인되었습니다. 랄잡으로 활동을 시작해보세요.' }),
  signup_rejected: () => ({ title: '가입 거절', body: '아쉽지만 이번 가입 신청은 거절되었습니다.' }),
  tier_changed: (b) => ({ title: '등급 변경', body: `등급이 ${b.toTier}(으)로 변경되었습니다.` }),
  chat_mention: (b) => ({ title: '채팅 멘션', body: String(b.message ?? '새 메시지가 도착했습니다.') }),
};

Deno.serve(async (req) => {
  const body = await req.json();
  const build = MESSAGES[body.type];
  if (!build) {
    return new Response(JSON.stringify({ error: 'unknown notification type' }), { status: 400 });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let query = supabase.from('users').select('expo_push_token').eq('status', 'active').not('expo_push_token', 'is', null);
  if (body.userId) query = query.eq('id', body.userId);
  const { data: users, error } = await query;
  if (error) throw error;

  const { title, body: messageBody } = build(body);
  const messages = (users ?? [])
    .filter((u) => u.expo_push_token)
    .map((u) => ({ to: u.expo_push_token, title, body: messageBody, sound: 'default' }));

  if (messages.length > 0) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  }

  return new Response(JSON.stringify({ sent: messages.length }), { headers: { 'Content-Type': 'application/json' } });
});
