import type { ArrivalTime, Category, EventSettings, SavedResponse } from "./event";
import { supabase } from "./supabase";

function check<T>({ data, error }: { data: T; error: { message: string } | null }) {
  if (error) throw new Error(error.message);
  return data;
}

// 회원가입 없이 브라우저별 익명 세션. 같은 브라우저에서는 세션이 유지되어 기존 응답을 다시 불러옴
async function ensureSession() {
  const { data } = await supabase().auth.getSession();
  if (data.session) return;
  check(await supabase().auth.signInAnonymously());
}

export async function loadPublic() {
  const [settings, categories, counts] = await Promise.all([
    supabase()
      .from("event_settings")
      .select("event_date, event_time_label, venue_name, venue_address, venue_map_url, notice, voting_deadline")
      .single(),
    supabase()
      .from("food_categories")
      .select("id, name, food_candidates(id, name, description, map_url, rating, review_count, walk, menu)")
      .order("display_order")
      .order("display_order", { referencedTable: "food_candidates" }),
    supabase().rpc("vote_counts"),
  ]);
  return {
    settings: check(settings) as EventSettings,
    categories: check(categories) as Category[],
    counts: Object.fromEntries(
      (check(counts) as { candidate_id: number; votes: number }[]).map((c) => [c.candidate_id, Number(c.votes)]),
    ) as Record<number, number>,
  };
}

export async function loadMine() {
  // 처음 온 손님은 세션이 없으니 불러올 것도 없음. 익명 로그인은 실제로 응답할 때만 (IP당 시간 한도가 있음)
  const { data } = await supabase().auth.getSession();
  if (!data.session) return { response: null, vote: null };
  const [response, vote] = await Promise.all([
    supabase().from("responses").select("nickname, attendance_status, arrival_time, ticket_no").maybeSingle(),
    supabase().from("food_votes").select("candidate_id").maybeSingle(),
  ]);
  return {
    response: check(response) as SavedResponse | null,
    vote: (check(vote) as { candidate_id: number } | null)?.candidate_id ?? null,
  };
}

export const NICKNAME_TAKEN = "이미 다른 분이 회신한 이름입니다. 다른 이름을 적어 주세요.";

export async function submitResponse(nickname: string, status: "attending" | "declined", arrival: ArrivalTime | null) {
  await ensureSession();
  const result = await supabase().rpc("submit_response", { p_nickname: nickname, p_status: status, p_arrival: arrival });
  // 23505: 이름 중복 인덱스(0003)에 걸림. 봉투에서 미리 확인하지만 그 사이 다른 사람이 먼저 쓴 경우
  if (result.error?.code === "23505") throw new Error(NICKNAME_TAKEN);
  return check(result) as SavedResponse;
}

// 봉투에서 이름을 적을 때 미리 확인. 세션이 없어도 됨(내 응답만 제외)
export async function isNicknameTaken(nickname: string) {
  return check(await supabase().rpc("nickname_taken", { p_nickname: nickname })) as boolean;
}

export async function castVote(candidateId: number) {
  await ensureSession();
  check(await supabase().rpc("cast_vote", { p_candidate: candidateId }));
}

export async function cancelVote() {
  await ensureSession();
  check(await supabase().rpc("cancel_vote"));
}
