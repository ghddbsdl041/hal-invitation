"use server";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/supabase";

// 관리자 인증: 비밀번호 하나(ADMIN_PASSWORD). 로그인하면 비밀번호로 서명한 값을 httpOnly 쿠키에 저장.
// 비밀번호를 바꾸면 기존 쿠키는 자동으로 무효. DB 쓰기는 secret key(RLS 우회)로 서버에서만 수행
const COOKIE = "admin_session";

function password() {
  const p = process.env.ADMIN_PASSWORD;
  if (!p) throw new Error("ADMIN_PASSWORD가 설정되지 않았습니다.");
  return p;
}

const token = () => createHmac("sha256", password()).update("hal-invitation-admin").digest("hex");

function same(a: string, b: string) {
  const [x, y] = [Buffer.from(a), Buffer.from(b)];
  return x.length === y.length && timingSafeEqual(x, y);
}

async function requireAdmin() {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value || !same(value, token())) throw new Error("UNAUTHORIZED");
}

function db() {
  return createClient(supabaseUrl(), process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
}

function check<T>({ data, error }: { data: T; error: { message: string } | null }) {
  if (error) throw new Error(error.message);
  return data;
}

const text = (v: FormDataEntryValue | null, max = 200) => {
  const s = String(v ?? "").trim();
  if (s.length > max) throw new Error(`${max}자 이하로 입력해 주세요.`);
  return s || null;
};

// 비우면 null. 정수 여부·소수 자릿수는 DB 칸(int, numeric(2,1))이 검사
const num = (v: FormDataEntryValue | null, max: number) => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > max) throw new Error(`0~${max} 사이의 숫자로 입력해 주세요.`);
  return n;
};

const url = (v: FormDataEntryValue | null) => {
  const s = text(v, 500);
  if (s && !/^https?:\/\//i.test(s)) throw new Error("링크는 http:// 또는 https://로 시작해야 합니다.");
  return s;
};

export async function login(input: string) {
  const ok = same(input, password());
  if (!ok) {
    await new Promise((r) => setTimeout(r, 800)); // 무차별 대입 속도 늦추기
    return false;
  }
  (await cookies()).set(COOKIE, token(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7,
  });
  return true;
}

export async function logout() {
  (await cookies()).delete(COOKIE);
}

export async function getAdminData() {
  try {
    await requireAdmin();
  } catch {
    return null;
  }
  const [responses, settings, categories, votes] = await Promise.all([
    db()
      .from("responses")
      .select("nickname, attendance_status, arrival_time, ticket_no, created_at, updated_at, food_votes(candidate_id)")
      .order("created_at"),
    db().from("event_settings").select("*").single(),
    db()
      .from("food_categories")
      .select("id, name, display_order, is_active, food_candidates(id, name, description, map_url, rating, review_count, walk, menu, display_order, is_active)")
      .order("display_order")
      .order("display_order", { referencedTable: "food_candidates" }),
    db().rpc("vote_counts"), // 참석자 표만 집계
  ]);
  const counts = Object.fromEntries(
    (check(votes) as { candidate_id: number; votes: number }[]).map((v) => [v.candidate_id, Number(v.votes)]),
  ) as Record<number, number>;
  return {
    // food_votes.user_id가 기본키(1:1)라 실제로는 배열이 아닌 객체 하나가 옴. 타입 추론은 배열로 봐서 unknown을 거침
    responses: check(responses) as unknown as {
      nickname: string;
      attendance_status: "attending" | "declined";
      arrival_time: string | null;
      ticket_no: number;
      created_at: string;
      updated_at: string;
      food_votes: { candidate_id: number } | null; // 사용자당 1표라 객체 하나
    }[],
    settings: check(settings) as Record<string, string | null>,
    categories: check(categories) as {
      id: number;
      name: string;
      is_active: boolean;
      food_candidates: {
        id: number;
        name: string;
        description: string | null;
        map_url: string | null;
        rating: number | null;
        review_count: number | null;
        walk: string | null;
        menu: string | null;
        is_active: boolean;
      }[];
    }[],
    counts,
  };
}

export async function saveSettings(form: FormData) {
  await requireAdmin();
  const date = String(form.get("event_date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("날짜 형식이 올바르지 않습니다.");
  const deadline = String(form.get("voting_deadline") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(deadline)) throw new Error("투표 마감 형식이 올바르지 않습니다.");
  check(
    await db()
      .from("event_settings")
      .update({
        event_date: date,
        event_time_label: text(form.get("event_time_label"), 100) ?? "퇴근 후 저녁",
        venue_name: text(form.get("venue_name"), 100),
        venue_address: text(form.get("venue_address"), 200),
        venue_map_url: url(form.get("venue_map_url")),
        notice: text(form.get("notice"), 1000),
        voting_deadline: `${deadline}:00+09:00`, // 입력은 한국 시간
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1),
  );
}

export async function saveCandidate(form: FormData) {
  await requireAdmin();
  const name = text(form.get("name"), 60);
  if (!name) throw new Error("식당 이름을 입력해 주세요.");
  const row = {
    category_id: Number(form.get("category_id")),
    name,
    description: text(form.get("description"), 300),
    map_url: url(form.get("map_url")),
    rating: num(form.get("rating"), 5),
    review_count: num(form.get("review_count"), 100000),
    walk: text(form.get("walk"), 200),
    menu: text(form.get("menu"), 3000),
    is_active: form.get("is_active") === "on",
  };
  const id = form.get("id");
  check(id ? await db().from("food_candidates").update(row).eq("id", Number(id)) : await db().from("food_candidates").insert(row));
}

export async function deleteCandidate(id: number) {
  await requireAdmin();
  check(await db().from("food_candidates").delete().eq("id", id));
}

export async function saveCategory(form: FormData) {
  await requireAdmin();
  const name = text(form.get("name"), 30);
  if (!name) throw new Error("카테고리 이름을 입력해 주세요.");
  const id = form.get("id");
  check(
    id
      ? await db().from("food_categories").update({ name, is_active: form.get("is_active") === "on" }).eq("id", Number(id))
      : await db().from("food_categories").insert({ name, display_order: 99 }),
  );
}
