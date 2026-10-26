export const ARRIVAL_TIMES = ["19:00", "19:30", "20:00", "20:30"] as const;
export type ArrivalTime = (typeof ARRIVAL_TIMES)[number];

export type EventSettings = {
  event_date: string;
  event_time_label: string;
  venue_name: string | null;
  venue_address: string | null;
  venue_map_url: string | null;
  notice: string | null;
  voting_deadline: string;
};

export type Candidate = {
  id: number;
  name: string;
  description: string | null; // 평가(후기 요약)
  map_url: string | null;
  rating: number | null;
  review_count: number | null;
  walk: string | null; // 한 줄에 하나
  menu: string | null; // 한 줄에 "메뉴명 | 가격"
};

export type Category = {
  id: number;
  name: string;
  food_candidates: Candidate[];
};

export type SavedResponse = {
  nickname: string;
  attendance_status: "attending" | "declined";
  arrival_time: ArrivalTime | null;
  ticket_no: number;
};

export const formatTicketNo = (n: number) => `1028-${String(n).padStart(4, "0")}`;

// 관리자가 입력한 링크라도 javascript: 등은 렌더링하지 않음
export const safeUrl = (url: string | null) => (url && /^https?:\/\//i.test(url) ? url : null);

const KST = { timeZone: "Asia/Seoul" } as const;

export const formatEventDate = (date: string) =>
  new Intl.DateTimeFormat("ko-KR", { ...KST, year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(
    new Date(`${date}T12:00:00+09:00`),
  );

export const formatDeadline = (iso: string) =>
  new Intl.DateTimeFormat("ko-KR", { ...KST, month: "long", day: "numeric", weekday: "short", hour: "numeric", minute: "2-digit" }).format(
    new Date(iso),
  );
