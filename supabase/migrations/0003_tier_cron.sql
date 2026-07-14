-- Monthly promotion/demotion batch (spec section 5): runs at 00:05 on the 1st of each month.
create extension if not exists pg_cron;

create or replace function run_monthly_tier_batch() returns void
language plpgsql security definer set search_path = public as $$
declare
  prev_month text := to_char(now() - interval '1 month', 'YYYY-MM');
  member record;
  next_tier tier;
  tier_order tier[] := array['guest', 'raljab', 'talbuchak', 'taljuninja', 'akatsuki'];
  current_idx int;
begin
  for member in
    select u.*, coalesce(am.count, 0) as prev_attendance
    from users u
    left join attendance_month am on am.user_id = u.id and am.year_month = prev_month
    where u.status = 'active'
  loop
    current_idx := array_position(tier_order, member.tier);

    if member.prev_attendance >= 4 and member.tier <> 'akatsuki' then
      next_tier := tier_order[least(current_idx + 1, 4)];
      if next_tier <> member.tier then
        update users set tier = next_tier, consecutive_absent_months = 0 where id = member.id;
        insert into tier_logs (user_id, from_tier, to_tier, reason) values (member.id, member.tier, next_tier, '월 4회 이상 출석');
      end if;

    elsif member.prev_attendance = 0 then
      update users set consecutive_absent_months = member.consecutive_absent_months + 1 where id = member.id;

      if member.consecutive_absent_months + 1 >= 3 then
        update users set status = 'expelled' where id = member.id;
        insert into tier_logs (user_id, from_tier, to_tier, reason) values (member.id, member.tier, member.tier, '3개월 연속 미참석 - 탈퇴');
      elsif member.tier <> 'raljab' and member.tier <> 'guest' then
        next_tier := tier_order[greatest(current_idx - 1, 1)];
        update users set tier = next_tier where id = member.id;
        insert into tier_logs (user_id, from_tier, to_tier, reason) values (member.id, member.tier, next_tier, '월 미참석 - 강등');
      end if;
    else
      update users set consecutive_absent_months = 0 where id = member.id;
    end if;
  end loop;
end;
$$;

select cron.schedule('agit-monthly-tier-batch', '5 0 1 * *', $$select run_monthly_tier_batch()$$);

-- Keeps attendance_month current so the batch above (and the app's monthly progress bar) stay accurate.
create or replace function record_attendance_month() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into attendance_month (user_id, year_month, count)
  values (new.user_id, to_char(new.checked_at, 'YYYY-MM'), 1)
  on conflict (user_id, year_month) do update set count = attendance_month.count + 1;

  update users
  set monthly_attendance = (
        select count from attendance_month
        where user_id = new.user_id and year_month = to_char(now(), 'YYYY-MM')
      ),
      total_attendance = total_attendance + 1
  where id = new.user_id;

  return new;
end;
$$;

create trigger attendances_after_insert
  after insert on attendances
  for each row execute function record_attendance_month();
