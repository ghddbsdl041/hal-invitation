-- 메뉴 카드를 줄글 대신 항목별로 보여주기 위한 칸. description은 '평가'(후기 요약)로 사용
alter table public.food_candidates
  add column rating numeric(2, 1) check (rating between 0 and 5),
  add column review_count int check (review_count >= 0),
  add column walk text, -- 한 줄에 하나: "회사에서 도보 37분(2.3km)"
  add column menu text; -- 한 줄에 하나: "메뉴명 | 가격". 위에서 3개가 대표로 먼저 보임
