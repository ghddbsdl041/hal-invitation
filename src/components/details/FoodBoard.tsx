"use client";

import { useState } from "react";
import { formatDeadline, safeUrl, type Category } from "@/lib/event";
import styles from "./Details.module.scss";

type Props = {
  categories: Category[];
  counts: Record<number, number>;
  myVote: number | null;
  attending: boolean;
  deadline: string;
  scrollIntoView?: boolean;
  onVote: (candidateId: number) => Promise<void>;
  onCancel: () => Promise<void>;
};

export default function FoodBoard({ categories, counts, myVote, attending, deadline, scrollIntoView, onVote, onCancel }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 마감 여부는 서버(cast_vote)에서 다시 검사. 화면은 안내용이라 화면을 연 시각 기준으로 충분
  const [openedAt] = useState(() => Date.now());
  const closed = openedAt >= new Date(deadline).getTime();
  const canVote = attending && !closed;

  async function run(action: () => Promise<void>) {
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className={styles.section}
      aria-labelledby="food-board"
      ref={(el) => {
        if (scrollIntoView) el?.scrollIntoView({ block: "start" });
      }}
    >
      <h2 id="food-board" className={styles.heading}>
        메뉴 후보
      </h2>
      <p className={styles.guide}>
        {closed
          ? "투표가 마감되었습니다."
          : attending
            ? `한 곳에 투표해 주세요. 마감 전까지 바꿀 수 있습니다. (마감: ${formatDeadline(deadline)})`
            : `참석을 확정하신 분만 투표할 수 있습니다. (마감: ${formatDeadline(deadline)})`}
      </p>

      {categories.map((category) => (
        <div key={category.id} className={styles.category}>
          <h3 className={styles.categoryName}>{category.name}</h3>
          {category.food_candidates.length === 0 ? (
            <p className={styles.empty}>후보 식당을 준비하고 있습니다.</p>
          ) : (
            <ul className={styles.candidates}>
              {category.food_candidates.map((c) => {
                const mine = myVote === c.id;
                const mapUrl = safeUrl(c.map_url);
                return (
                  <li key={c.id} className={styles.candidate} data-mine={mine}>
                    <div className={styles.candidateText}>
                      <strong>{c.name}</strong>
                      {c.description && <span className={styles.sub}>{c.description}</span>}
                      {mapUrl && (
                        <a className={styles.mapLink} href={mapUrl} target="_blank" rel="noopener noreferrer">
                          카카오맵
                        </a>
                      )}
                    </div>
                    <div className={styles.voteBox}>
                      <span className={styles.count}>{counts[c.id] ?? 0}표</span>
                      {canVote && (
                        <button
                          type="button"
                          className={styles.voteButton}
                          aria-pressed={mine}
                          disabled={pending}
                          onClick={() => run(() => (mine ? onCancel() : onVote(c.id)))}
                        >
                          {mine ? "투표 취소" : "투표"}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
