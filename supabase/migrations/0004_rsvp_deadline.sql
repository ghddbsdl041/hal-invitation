-- 예약 인원을 확정하려고 투표 마감(voting_deadline) 이후에는 참석 회신(새 회신·변경)도 받지 않음
create or replace function public.submit_response(p_nickname text, p_status text, p_arrival text)
returns public.responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  result public.responses;
begin
  if uid is null then
    raise exception '로그인 세션이 없습니다' using errcode = '28000';
  end if;
  if now() >= (select voting_deadline from public.event_settings where id = 1) then
    raise exception '회신이 마감되었습니다' using errcode = '42501';
  end if;

  insert into public.responses (user_id, nickname, attendance_status, arrival_time)
  values (uid, trim(p_nickname), p_status, case when p_status = 'attending' then p_arrival end)
  on conflict (user_id) do update
    set nickname = excluded.nickname,
        attendance_status = excluded.attendance_status,
        arrival_time = excluded.arrival_time,
        updated_at = now()
  returning * into result;

  if p_status = 'declined' then
    delete from public.food_votes where user_id = uid;
  end if;

  return result;
end;
$$;
