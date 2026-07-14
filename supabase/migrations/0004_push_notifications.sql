-- Deposit-day and schedule/approval/tier-change push notifications (spec section 10).
create extension if not exists pg_net;

-- Re-schedules itself daily; fires the edge function only when today matches dues_settings.deposit_day.
create or replace function trigger_deposit_reminder() returns void
language plpgsql security definer set search_path = public as $$
declare
  settings dues_settings;
begin
  select * into settings from dues_settings where id = 1;
  if settings.notify_on and extract(day from now()) = settings.deposit_day then
    perform net.http_post(
      url := current_setting('app.settings.edge_function_url') || '/send-push',
      headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'), 'Content-Type', 'application/json'),
      body := jsonb_build_object('type', 'deposit_reminder', 'amount', settings.monthly_fee)
    );
  end if;
end;
$$;

select cron.schedule('agit-daily-deposit-check', '0 9 * * *', $$select trigger_deposit_reminder()$$);

comment on function trigger_deposit_reminder is
  'Requires app.settings.edge_function_url and app.settings.service_role_key to be set via ALTER DATABASE ... SET, see README for setup.';
