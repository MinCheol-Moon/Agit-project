insert into chat_rooms (name, crew, min_tier) values
  ('전체방', null, 'talbuchak'),
  ('게임 크루', 'game', 'talbuchak'),
  ('차 크루', 'tea', 'talbuchak'),
  ('낚시 크루', 'fishing', 'talbuchak'),
  ('등산 크루', 'hiking', 'talbuchak')
on conflict do nothing;
