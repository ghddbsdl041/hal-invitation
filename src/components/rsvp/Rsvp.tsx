"use client";

import { useEffect, useRef, useState } from "react";
import type { ArrivalTime, SavedResponse } from "@/lib/event";
import ArrivalDialog from "./ArrivalDialog";
import styles from "./Rsvp.module.scss";

const DODGE_MS = 3000;
const TOUCH_WAIT_MS = 1500;
const DODGE_RADIUS = 90;

// ready: 처음 / dodging: 마우스를 피해 다니는 중 / waiting: 터치·키보드 첫 누름 후 잠시 대기 / armed: 누르면 불참 확정
type Phase = "ready" | "dodging" | "waiting" | "armed";

type Props = {
  saved: SavedResponse | null;
  // 응답 수정으로 돌아왔을 때 이 영역을 화면 가운데로
  scrollIntoView?: boolean;
  onAttend: (time: ArrivalTime) => Promise<void>;
  onDecline: () => Promise<void>;
  onTicket: () => void;
};

export default function Rsvp({ saved, scrollIntoView = false, onAttend, onDecline, onTicket }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("ready");
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [declining, setDeclining] = useState(false);
  const [declineError, setDeclineError] = useState<string | null>(null);
  // 이미 응답했으면 버튼을 숨기고 현재 응답만 표시. 수정은 티켓·마지막 화면의 '응답 수정'(scrollIntoView)이나 여기서 펼쳐서
  const [revealed, setRevealed] = useState(false);
  const showButtons = !saved || scrollIntoView || revealed;
  const rootRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const attendRef = useRef<HTMLButtonElement>(null);
  const declineRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!scrollIntoView) return;
    rootRef.current?.scrollIntoView({ block: "center" });
    attendRef.current?.focus({ preventScroll: true });
  }, [scrollIntoView]);

  useEffect(() => {
    if (phase !== "dodging" && phase !== "waiting") return;
    const t = setTimeout(() => {
      setPhase("armed");
      setOffset({ x: 0, y: 0 }); // 장난이 끝나면 제자리로
    }, phase === "dodging" ? DODGE_MS : TOUCH_WAIT_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (revealed) attendRef.current?.focus();
  }, [revealed]);

  useEffect(() => {
    if (!showButtons || (phase !== "ready" && phase !== "dodging")) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function onMove(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      const btn = declineRef.current!.getBoundingClientRect();
      const near = (x: number, y: number) =>
        Math.hypot(e.clientX - x, e.clientY - y) < DODGE_RADIUS;
      if (!near(btn.left + btn.width / 2, btn.top + btn.height / 2)) return;

      // 영역 안에서 커서와 충분히 먼 자리로 이동 (버튼이 영역·화면 밖으로 나가지 않음)
      // 참석 버튼 위에 겹치면 참석하려다 불참을 누를 수 있어 제외
      // 좌표는 영역 기준 레이아웃 값(offsetLeft/Top) 사용: 이동 애니메이션 중간 위치에 영향받지 않음
      const area = areaRef.current!;
      const attend = attendRef.current!;
      const decline = declineRef.current!;
      const ax = area.getBoundingClientRect();
      const w = decline.offsetWidth;
      const h = decline.offsetHeight;
      const gap = 8;
      for (let i = 0; i < 50; i++) {
        const nx = Math.random() * (area.clientWidth - w);
        const ny = Math.random() * (area.clientHeight - h);
        const overlapsAttend =
          nx < attend.offsetLeft + attend.offsetWidth + gap &&
          nx + w > attend.offsetLeft - gap &&
          ny < attend.offsetTop + attend.offsetHeight + gap &&
          ny + h > attend.offsetTop - gap;
        const tooClose =
          Math.hypot(e.clientX - (ax.left + nx + w / 2), e.clientY - (ax.top + ny + h / 2)) <
          DODGE_RADIUS * 1.8;
        if (overlapsAttend || tooClose) continue;
        setOffset({ x: nx - decline.offsetLeft, y: ny - decline.offsetTop });
        break;
      }
      setPhase("dodging");
    }

    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [phase, showButtons]);

  async function handleDecline() {
    if (phase === "armed") {
      if (declining) return;
      setDeclining(true);
      setDeclineError(null);
      try {
        await onDecline();
      } catch (e) {
        setDeclineError((e as Error).message);
        setDeclining(false);
      }
    }
    // 인터랙션 도중에는 응답하지 않음. 터치·키보드·움직임 줄이기는 첫 누름에 안내만 표시
    else if (phase === "ready") setPhase("waiting");
  }

  const busy = phase === "dodging" || phase === "waiting" || declining;

  return (
    <div className={styles.rsvp} ref={rootRef}>
      <h2 className={styles.heading}>회신</h2>
      {saved && (
        <p className={styles.current}>
          현재 응답:{" "}
          {saved.attendance_status === "attending" ? `참석 (${saved.arrival_time} 도착 예정)` : "불참"}
        </p>
      )}
      {saved?.attendance_status === "attending" && (
        <button type="button" className={styles.ticket} onClick={onTicket}>
          내 티켓 보기
        </button>
      )}
      {!showButtons && (
        <button type="button" className={styles.edit} onClick={() => setRevealed(true)}>
          응답 수정하기
        </button>
      )}
      {showButtons && (
        <>
          <div ref={areaRef} className={styles.area}>
            <button
              ref={attendRef}
              type="button"
              className={styles.attend}
              onClick={() => setDialogOpen(true)}
            >
              참석하겠습니다
            </button>
            <button
              ref={declineRef}
              type="button"
              className={styles.decline}
              style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
              onClick={handleDecline}
              aria-disabled={busy}
            >
              {declining ? "저장 중…" : "불참하겠습니다"}
            </button>
          </div>
          <p className={styles.tease} aria-live="polite">
            {(phase === "waiting" || phase === "armed") &&
              "히히 같이 참석하고 싶은 마음에 잠깐 움직여보았습니다"}
          </p>

          {declineError && (
            <p className={styles.error} role="alert">
              불참 응답을 저장하지 못했습니다. 다시 눌러 주세요. ({declineError})
            </p>
          )}
        </>
      )}

      <ArrivalDialog
        open={dialogOpen}
        initial={saved?.arrival_time ?? null}
        onCancel={() => setDialogOpen(false)}
        onConfirm={async (time) => {
          await onAttend(time);
          setDialogOpen(false);
          setRevealed(false);
        }}
      />
    </div>
  );
}
