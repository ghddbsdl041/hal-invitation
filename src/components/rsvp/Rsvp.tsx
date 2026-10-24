"use client";

import { useEffect, useRef, useState } from "react";
import ArrivalDialog, { type ArrivalTime } from "./ArrivalDialog";
import styles from "./Rsvp.module.scss";

const DODGE_MS = 3000;
const TOUCH_WAIT_MS = 1500;
const DODGE_RADIUS = 90;

// ready: 처음 / dodging: 마우스를 피해 다니는 중 / waiting: 터치·키보드 첫 누름 후 잠시 대기 / armed: 누르면 불참 확정
type Phase = "ready" | "dodging" | "waiting" | "armed";

type Props = {
  initialArrival: ArrivalTime | null;
  // 응답 수정으로 돌아왔을 때 이 영역을 화면 가운데로
  scrollIntoView?: boolean;
  onAttend: (time: ArrivalTime) => void;
  onDecline: () => void;
};

export default function Rsvp({ initialArrival, scrollIntoView = false, onAttend, onDecline }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("ready");
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const areaRef = useRef<HTMLDivElement>(null);
  const attendRef = useRef<HTMLButtonElement>(null);
  const declineRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (phase !== "dodging" && phase !== "waiting") return;
    const t = setTimeout(() => setPhase("armed"), phase === "dodging" ? DODGE_MS : TOUCH_WAIT_MS);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "ready" && phase !== "dodging") return;
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
  }, [phase]);

  function handleDecline() {
    if (phase === "armed") onDecline();
    // 인터랙션 도중에는 응답하지 않음. 터치·키보드·움직임 줄이기는 첫 누름에 안내만 표시
    else if (phase === "ready") setPhase("waiting");
  }

  const busy = phase === "dodging" || phase === "waiting";

  return (
    <div
      className={styles.rsvp}
      ref={(el) => {
        if (!scrollIntoView || !el) return;
        el.scrollIntoView({ block: "center" });
        attendRef.current?.focus({ preventScroll: true });
      }}
    >
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
          불참하겠습니다
        </button>
      </div>
      <p className={styles.tease} aria-live="polite">
        {(phase === "waiting" || phase === "armed") &&
          "히히 같이 참석하고 싶은 마음에 잠깐 움직여보았습니다"}
      </p>

      <ArrivalDialog
        open={dialogOpen}
        initial={initialArrival}
        onCancel={() => setDialogOpen(false)}
        onConfirm={(time) => {
          setDialogOpen(false);
          onAttend(time);
        }}
      />
    </div>
  );
}
