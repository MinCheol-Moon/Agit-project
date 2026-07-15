-- Extend the monthly deposit reminder to also post a chat message into the
-- general room ("전체방"), not just a push notification. The push call is
-- wrapped so its failure (e.g. the send-push edge function isn't deployed)
-- never rolls back the chat message.
create or replace function trigger_deposit_reminder() returns void
language plpgsql security definer set search_path = public as $$
declare
  settings dues_settings;
  general_room_id uuid;
begin
  select * into settings from dues_settings where id = 1;
  if settings.notify_on and extract(day from now()) = settings.deposit_day then
    select id into general_room_id from chat_rooms where name = '전체방' limit 1;
    if general_room_id is not null then
      insert into messages (room_id, user_id, body)
      values (
        general_room_id,
        null,
        format('오늘은 회비 납부일입니다. 이번 달 회비 %s원을 입금해주세요!', to_char(settings.monthly_fee, 'FM999,999,999'))
      );
    end if;

    begin
      perform net.http_post(
        url := current_setting('app.settings.edge_function_url') || '/send-push',
        headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'), 'Content-Type', 'application/json'),
        body := jsonb_build_object('type', 'deposit_reminder', 'amount', settings.monthly_fee)
      );
    exception when others then
      null;
    end;
  end if;
end;
$$;
