"use client";

import { useEffect, useRef, useState } from "react";
import { ARRIVAL_TIMES, type ArrivalTime } from "@/lib/event";
import styles from "./ArrivalDialog.module.scss";

type Props = {
  open: boolean;
  initial: ArrivalTime | null;
  onCancel: () => void;
  onConfirm: (time: ArrivalTime) => Promise<void>;
};

// 네이티브 <dialog>.showModal(): 포커스 가두기·Esc 닫기·배경 비활성화를 브라우저가 처리
export default function ArrivalDialog({ open, initial, onCancel, onConfirm }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  // 취소 후 다시 열어도 고른 시간이 남도록 컴포넌트는 계속 마운트된 채로 둠
  const [time, setTime] = useState<ArrivalTime | null>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current!;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} className={styles.dialog} onClose={onCancel} aria-labelledby="arrival-title">
      <form
        className={styles.form}
        onSubmit={async (e) => {
          e.preventDefault();
          if (!time || pending) return;
          setPending(true);
          setError(null);
          try {
            await onConfirm(time);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setPending(false);
          }
        }}
      >
        <div className={styles.moon} aria-hidden="true" />
        <h2 id="arrival-title" className={styles.title}>
          몇 시쯤 도착하시겠습니까?
        </h2>
        <p className={styles.guide}>귀하의 도착 예정 시각을 선택해 주십시오.</p>

        <fieldset className={styles.times}>
          <legend className="sr-only">도착 예정 시각</legend>
          {ARRIVAL_TIMES.map((t) => (
            <label key={t} className={styles.time}>
              <input
                type="radio"
                name="arrival"
                value={t}
                checked={time === t}
                onChange={() => setTime(t)}
              />
              <span>{t}</span>
            </label>
          ))}
        </fieldset>

        {error && (
          <p className={styles.error} role="alert">
            저장하지 못했습니다. 다시 시도해 주세요.
            <br />({error})
          </p>
        )}
        <button type="submit" className={styles.confirm} disabled={!time || pending}>
          {pending ? "저장 중…" : "이 시간으로 확정"}
        </button>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          돌아가기
        </button>
      </form>
    </dialog>
  );
}
