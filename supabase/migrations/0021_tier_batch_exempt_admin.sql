-- Freeze admins and the master: the monthly attendance batch must never
-- promote, demote, or expel them - their rank is fixed regardless of
-- attendance. Auto-promotion still tops out at 아카츠키 (akatsuki); the batch
-- can never reach 'admin' since it isn't in tier_order. Only the loop's
-- membership filter changes from 0003.
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
      and u.tier <> 'admin'
      and coalesce(u.is_master, false) = false
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
