"use client";

import { useState } from "react";
import { formatEventDate, safeUrl, type Category, type EventSettings } from "@/lib/event";
import styles from "./Details.module.scss";

type Props = {
  settings: EventSettings;
  categories: Category[];
  counts: Record<number, number>;
};

// 관리자가 장소를 정하기 전까지는 현재 득표 1위 가게를 장소 자리에 보여줌 (동률이면 함께)
function Leader({ categories, counts, closed }: Omit<Props, "settings"> & { closed: boolean }) {
  const all = categories.flatMap((c) => c.food_candidates);
  const total = all.reduce((sum, c) => sum + (counts[c.id] ?? 0), 0);
  const max = Math.max(0, ...all.map((c) => counts[c.id] ?? 0));
  const leaders = max > 0 ? all.filter((c) => (counts[c.id] ?? 0) === max) : [];

  if (leaders.length === 0) {
    return <>아직 표가 없습니다. 메뉴에 투표하면 1위 가게가 여기에 올라옵니다.</>;
  }
  return (
    <>
      <span className={styles.live} data-closed={closed}>
        {closed ? "투표 결과" : "LIVE"}
      </span>
      {/* 1위가 바뀌면 다시 마운트돼 톡 튀어 오름 */}
      <strong key={leaders.map((c) => c.id).join()} className={styles.leader}>
        {leaders.length > 1 ? "공동 1위 " : "현재 1위 "}
        {leaders.map((c) => c.name).join(" · ")}
      </strong>
      <span className={styles.sub}>
        {max}표 · 득표율 {Math.round((max / total) * 100)}%
        {closed ? "" : " — 투표 마감까지 득표에 따라 바뀝니다."}
      </span>
    </>
  );
}

export default function EventInfo({ settings, categories, counts }: Props) {
  const mapUrl = safeUrl(settings.venue_map_url);
  // 마감 여부는 안내용이라 화면을 연 시각 기준으로 충분 (FoodBoard와 같음)
  const [openedAt] = useState(() => Date.now());
  const closed = openedAt >= new Date(settings.voting_deadline).getTime();
  return (
    <section className={styles.section} aria-labelledby="event-info">
      <h2 id="event-info" className={styles.heading}>
        만찬 안내
      </h2>
      <dl className={styles.info}>
        <dt>날짜</dt>
        <dd className={styles.date}>{formatEventDate(settings.event_date)}</dd>
        <dt>시간</dt>
        <dd>{settings.event_time_label}</dd>
        <dt>장소</dt>
        <dd>
          {settings.venue_name ?? <Leader categories={categories} counts={counts} closed={closed} />}
          {settings.venue_address && <span className={styles.sub}>{settings.venue_address}</span>}
          {mapUrl && (
            <a className={styles.mapLink} href={mapUrl} target="_blank" rel="noopener noreferrer">
              지도 보기
            </a>
          )}
        </dd>
      </dl>
      {settings.notice && <p className={styles.notice}>{settings.notice}</p>}
    </section>
  );
}
