"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { formatDeadline, safeUrl, type Candidate, type Category } from "@/lib/event";
import styles from "./Details.module.scss";

// 하이드레이션 전에 이미 실패한 사진은 onError가 오지 않아서 ref에서도 확인
function hideIfBroken(img: HTMLImageElement | null) {
  if (img?.complete && !img.naturalWidth) img.parentElement!.hidden = true;
}

// 아직 받는 중인 사진만 표시해 두고(자리 깜빡임 + 도착하면 페이드), 이미 받아 둔 사진은 그대로 보여줌
function markLoading(img: HTMLImageElement | null) {
  if (!img) return;
  hideIfBroken(img);
  if (!img.complete) img.parentElement!.dataset.loading = "";
}

// 남은 시간: 하루 이상이면 "1일 02:13:05", 아니면 "02:13:05"
function formatLeft(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const hms = [Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
  return d > 0 ? `${d}일 ${hms}` : hms;
}

// 메뉴는 위에서부터 이만큼 바로 보이고 나머지는 '더 보기'로 펼침
const MENU_PREVIEW = 3;

function Stars({ rating }: { rating: number }) {
  return (
    <span className={styles.rating}>
      {/* 회색 별 위에 색 별을 점수 비율만큼 덮음: 3.9점이면 넷째 별이 90% */}
      <span className={styles.stars} aria-hidden="true">
        ★★★★★
        <span style={{ width: `${(rating / 5) * 100}%` }}>★★★★★</span>
      </span>
      <span className="sr-only">5점 만점에 </span>
      {rating.toFixed(1)}
      <span className="sr-only">점</span>
    </span>
  );
}

function MenuItems({ lines }: { lines: string[] }) {
  return (
    <ul className={styles.menu}>
      {lines.map((line, i) => {
        const [name, price] = line.split("|").map((s) => s.trim());
        return (
          <li key={i}>
            <span>{name}</span>
            {price && <span className={styles.price}>{price}</span>}
          </li>
        );
      })}
    </ul>
  );
}

// 줄글 대신 항목: 값 형태로 보여줘서 필요한 줄만 골라 읽을 수 있게
function Facts({ c }: { c: Candidate }) {
  const menu = c.menu?.split("\n").filter((l) => l.trim()) ?? [];
  const rest = menu.slice(MENU_PREVIEW);
  return (
    <dl className={styles.facts}>
      <dt>별점</dt>
      <dd>{c.rating == null ? "카카오맵 별점 없음" : <Stars rating={c.rating} />}</dd>
      {c.review_count != null && (
        <>
          <dt>후기</dt>
          <dd>{c.review_count}개</dd>
        </>
      )}
      {c.walk && (
        <>
          <dt>거리</dt>
          <dd className={styles.lines}>{c.walk}</dd>
        </>
      )}
      {menu.length > 0 && (
        <>
          <dt>메뉴</dt>
          <dd>
            <MenuItems lines={menu.slice(0, MENU_PREVIEW)} />
            {rest.length > 0 && (
              <details className={styles.more}>
                <summary>메뉴 {rest.length}개 더 보기</summary>
                <MenuItems lines={rest} />
              </details>
            )}
          </dd>
        </>
      )}
      {c.description && (
        <>
          <dt>평가</dt>
          <dd>{c.description}</dd>
        </>
      )}
    </dl>
  );
}

type Props = {
  categories: Category[];
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
  // 카운트다운용으로 1초마다 갱신. 마감 여부는 서버(cast_vote)에서 다시 검사하고, 화면은 0이 되는 순간 마감으로 바뀜
  const [now, setNow] = useState(() => Date.now());
  const left = new Date(deadline).getTime() - now;
  const closed = left <= 0;
  useEffect(() => {
    if (closed) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [closed]);
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
      {!closed && (
        <p className={styles.countdown}>
          <span className={styles.countdownLabel}>투표 마감까지</span>
          {/* 1초마다 바뀌므로 스크린리더에는 마감 시각만 */}
          <span className={styles.countdownTime} aria-hidden="true">
            {formatLeft(left)}
          </span>
          <span className={styles.countdownAt}>마감 {formatDeadline(deadline)}</span>
        </p>
      )}
      <p className={styles.guide}>
        {closed
          ? "투표가 마감되었습니다."
          : attending
            ? myVote === null
              ? "한 곳에 투표해 주세요."
              : "다른 가게의 '여기로 변경'을 누르면 투표가 옮겨집니다."
            : "참석을 확정하신 분만 투표할 수 있습니다."}
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
                        ref={markLoading}
                        onLoad={(e) => delete e.currentTarget.parentElement!.dataset.loading}
                        onError={(e) => hideIfBroken(e.currentTarget)}
                      />
                    </div>
                    <div className={styles.candidateText}>
                      <div className={styles.nameRow}>
                        <strong>{c.name}</strong>
                        {mapUrl && (
                          <a className={styles.mapLink} href={mapUrl} target="_blank" rel="noopener noreferrer">
                            카카오맵
                          </a>
                        )}
                      </div>
                      <Facts c={c} />
                    </div>
                    <div className={styles.voteBox}>
                      {canVote ? (
                        <button
                          type="button"
                          className={styles.voteButton}
                          aria-pressed={mine}
                          // disabled로 바꾸면 누른 버튼에서 포커스가 빠져서 aria-disabled + 클릭 무시
                          aria-disabled={pending}
                          onClick={() => !pending && run(() => (mine ? onCancel() : onVote(c.id)))}
                        >
                          {/* 이미 투표했으면 다른 가게 버튼은 표를 바로 옮김 (cast_vote가 사용자당 1표로 덮어씀) */}
                          {mine ? "투표 취소" : myVote === null ? "투표" : "여기로 변경"}
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
