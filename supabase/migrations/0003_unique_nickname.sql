-- 이미 다른 사람이 회신한 이름(띄어쓰기·대소문자 무시)은 쓸 수 없게: 남의 이름으로 들어와 회신하는 장난 방지
create unique index responses_nickname_unique on public.responses (lower(regexp_replace(nickname, '\s', '', 'g')));

-- 봉투에서 이름을 적을 때 미리 확인용. 내 응답(같은 세션)은 제외. 최종 보장은 위 인덱스
create function public.nickname_taken(p_nickname text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.responses
    where lower(regexp_replace(nickname, '\s', '', 'g')) = lower(regexp_replace(p_nickname, '\s', '', 'g'))
      and user_id is distinct from auth.uid()
  );
$$;

revoke execute on function public.nickname_taken from public;
grant execute on function public.nickname_taken to anon, authenticated;
