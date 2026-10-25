"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { formatDeadline, safeUrl, type Category } from "@/lib/event";
import styles from "./Details.module.scss";

// 하이드레이션 전에 이미 실패한 사진은 onError가 오지 않아서 ref에서도 확인
function hideIfBroken(img: HTMLImageElement | null) {
  if (img?.complete && !img.naturalWidth) img.parentElement!.hidden = true;
}

type Props = {
  categories: Category[];
  counts: Record<number, number>;
  myVote: number | null;
  attending: boolean;
  deadline: string;
  scrollIntoView?: boolean;
  // 방금 참석을 확정하고 넘어온 경우 안내 문구 표시
  justAttended?: boolean;
  onVote: (candidateId: number) => Promise<void>;
  onCancel: () => Promise<void>;
  onTicket: () => void;
};

export default function FoodBoard({
  categories,
  counts,
  myVote,
  attending,
  deadline,
  scrollIntoView,
  justAttended,
  onVote,
  onCancel,
  onTicket,
}: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 마감 여부는 서버(cast_vote)에서 다시 검사. 화면은 안내용이라 화면을 연 시각 기준으로 충분
  const [openedAt] = useState(() => Date.now());
  const closed = openedAt >= new Date(deadline).getTime();
  const canVote = attending && !closed;

  useEffect(() => {
    if (!scrollIntoView) return;
    // 시간 선택 모달이 닫히며 포커스를 참석 버튼으로 되돌린 뒤에 옮기도록 한 프레임 미룸
    const frame = requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ block: "start" });
      headingRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [scrollIntoView]);

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
    <section className={styles.section} aria-labelledby="food-board" ref={sectionRef}>
      <h2 id="food-board" className={styles.heading} tabIndex={-1} ref={headingRef}>
        메뉴 후보
      </h2>
      {/* 평소의 '내 티켓 보기'는 회신 영역에. 여기는 방금 참석한 경우의 안내만 */}
      {attending && justAttended && (
        <div className={styles.attendBar} role="status">
          <p>
            참석이 확정되었습니다!
            <br />
            {closed ? "투표는 마감되었습니다." : "메뉴에 투표하신 뒤 티켓을 받아 가세요."}
          </p>
          <button type="button" className={styles.ticketButton} onClick={onTicket}>
            티켓 받기
          </button>
        </div>
      )}
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
                    {/* shortcut: 사진은 public/assets/food/{가게 이름}.jpg, 관리자에서 이름을 바꾸면 파일명도 바꿔야 함. 파일이 없으면 칸을 숨김 */}
                    <div className={styles.photo}>
                      <Image
                        src={`/assets/food/${encodeURIComponent(c.name)}.jpg`}
                        alt=""
                        fill
                        sizes="(min-width: 1280px) 320px, 90vw"
                        ref={hideIfBroken}
                        onError={(e) => hideIfBroken(e.currentTarget)}
                      />
                    </div>
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
                      {canVote ? (
                        <button
                          type="button"
                          className={styles.voteButton}
                          aria-pressed={mine}
                          // disabled로 바꾸면 누른 버튼에서 포커스가 빠져서 aria-disabled + 클릭 무시
                          aria-disabled={pending}
                          onClick={() => !pending && run(() => (mine ? onCancel() : onVote(c.id)))}
                        >
                          {mine ? "투표 취소" : "투표"}
                        </button>
                      ) : (
                        !closed && (
                          // 참석 전에도 투표가 있다는 걸 알 수 있게 비활성 버튼으로 표시
                          <button type="button" className={styles.voteButton} disabled>
                            참석 후 투표
                          </button>
                        )
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
