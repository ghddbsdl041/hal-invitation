-- 할로윈 저녁 초대장 초기 스키마
-- 원칙: 손님은 익명 로그인(auth.uid())으로 식별. 응답·투표 쓰기는 아래 함수로만 가능(테이블 직접 쓰기 정책 없음)
--       → 응답 변경과 투표 취소가 한 트랜잭션에서 처리되고, 클라이언트가 보낸 user_id는 쓰지 않음
-- 관리자 작업은 서버에서 secret key(RLS 우회)로만 수행

-- ── 행사 정보 (항상 1행)
create table public.event_settings (
  id int primary key default 1 check (id = 1),
  event_date date not null default '2026-10-28',
  event_time_label text not null default '퇴근 후 저녁',
  venue_name text,
  venue_address text,
  venue_map_url text,
  notice text,
  voting_deadline timestamptz not null default '2026-10-27 18:00+09',
  updated_at timestamptz not null default now()
);
insert into public.event_settings default values;

-- ── 응답 (사용자당 1행, 변경은 업데이트)
create table public.responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 20),
  attendance_status text not null check (attendance_status in ('attending', 'declined')),
  arrival_time text check (arrival_time in ('19:00', '19:30', '20:00', '20:30')),
  ticket_no int generated always as identity,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((attendance_status = 'attending') = (arrival_time is not null))
);

-- ── 음식 후보
create table public.food_categories (
  id bigint generated always as identity primary key,
  name text not null,
  display_order int not null default 0,
  is_active boolean not null default true
);

create table public.food_candidates (
  id bigint generated always as identity primary key,
  category_id bigint not null references public.food_categories (id) on delete cascade,
  name text not null,
  description text,
  map_url text,
  display_order int not null default 0,
  is_active boolean not null default true
);

-- ── 투표 (사용자당 유효 1표 = user_id 기본키, 응답이 있어야 투표 가능)
create table public.food_votes (
  user_id uuid primary key references public.responses (user_id) on delete cascade,
  candidate_id bigint not null references public.food_candidates (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── RLS: 읽기만 허용, 쓰기 정책은 두지 않음
alter table public.event_settings enable row level security;
alter table public.responses enable row level security;
alter table public.food_categories enable row level security;
alter table public.food_candidates enable row level security;
alter table public.food_votes enable row level security;

create policy "행사 정보는 누구나 조회" on public.event_settings
  for select to anon, authenticated using (true);

create policy "활성 카테고리는 누구나 조회" on public.food_categories
  for select to anon, authenticated using (is_active);

create policy "활성 후보는 누구나 조회" on public.food_candidates
  for select to anon, authenticated using (is_active);

create policy "자기 응답만 조회" on public.responses
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "자기 투표만 조회" on public.food_votes
  for select to authenticated using ((select auth.uid()) = user_id);

-- ── 응답 저장: 불참으로 바뀌면 같은 트랜잭션에서 투표 삭제
create function public.submit_response(p_nickname text, p_status text, p_arrival text)
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

-- ── 투표: 참석자만, 마감 전만, 활성 후보만. 다시 투표하면 변경
create function public.cast_vote(p_candidate bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception '로그인 세션이 없습니다' using errcode = '28000';
  end if;
  if not exists (select 1 from public.responses where user_id = uid and attendance_status = 'attending') then
    raise exception '참석을 확정한 분만 투표할 수 있습니다' using errcode = '42501';
  end if;
  if now() >= (select voting_deadline from public.event_settings where id = 1) then
    raise exception '투표가 마감되었습니다' using errcode = '42501';
  end if;
  if not exists (select 1 from public.food_candidates where id = p_candidate and is_active) then
    raise exception '없는 후보입니다' using errcode = '22023';
  end if;

  insert into public.food_votes (user_id, candidate_id) values (uid, p_candidate)
  on conflict (user_id) do update set candidate_id = excluded.candidate_id, updated_at = now();
end;
$$;

create function public.cancel_vote()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if now() >= (select voting_deadline from public.event_settings where id = 1) then
    raise exception '투표가 마감되었습니다' using errcode = '42501';
  end if;
  delete from public.food_votes where user_id = auth.uid();
end;
$$;

-- ── 후보별 득표 수 (누가 투표했는지는 노출하지 않음, 참석자 표만 유효)
create function public.vote_counts()
returns table (candidate_id bigint, votes bigint)
language sql
security definer
set search_path = ''
stable
as $$
  select v.candidate_id, count(*)
  from public.food_votes v
  join public.responses r on r.user_id = v.user_id and r.attendance_status = 'attending'
  group by v.candidate_id;
$$;

-- 함수 실행 권한: 기본 PUBLIC 권한 회수 후 필요한 역할에만
revoke execute on function public.submit_response, public.cast_vote, public.cancel_vote, public.vote_counts from public, anon;
grant execute on function public.submit_response, public.cast_vote, public.cancel_vote to authenticated;
grant execute on function public.vote_counts to anon, authenticated, service_role;

-- ── 음식 후보 초기 카테고리 (식당은 관리자 페이지에서 입력)
insert into public.food_categories (name, display_order) values
  ('감자탕', 1), ('고기', 2), ('족발', 3), ('치킨', 4);
