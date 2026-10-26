"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { isNicknameTaken, NICKNAME_TAKEN } from "@/lib/api";
import styles from "./Envelope.module.scss";

const NICKNAME_MAX = 20;
// 스티커 0.4s + 덮개 0.9s(0.35s 지연) ≈ 1.25s 뒤 열린 모습을 0.6s 보여주고 0.4s 페이드아웃
const FADE_AT = 1850;
const DONE_AT = 2250;

type Props = {
  // 같은 브라우저로 다시 온 경우 저장된 닉네임 (불러오기가 끝난 뒤 도착할 수 있음)
  savedNickname?: string;
  onOpened: (nickname: string) => void;
};

export default function Envelope({ savedNickname, onOpened }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const opened = nickname !== null;

  useEffect(() => {
    // 사용자가 이미 입력하기 시작했으면 덮어쓰지 않음
    if (savedNickname && inputRef.current && !inputRef.current.value) inputRef.current.value = savedNickname;
  }, [savedNickname]);

  // 네이티브 <dialog>.showModal(): 포커스 가두기·Esc 닫기·배경 비활성화를 브라우저가 처리
  useEffect(() => {
    const dialog = dialogRef.current!;
    if (naming && !dialog.open) dialog.showModal();
    if (!naming && dialog.open) dialog.close();
  }, [naming]);

  useEffect(() => {
    if (nickname === null) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onOpened(nickname);
      return;
    }
    const fade = setTimeout(() => setLeaving(true), FADE_AT);
    const done = setTimeout(() => onOpened(nickname), DONE_AT);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, [nickname, onOpened]);

  function reject(message: string) {
    setError(message);
    // 다시 눌러도 매번 흔들리도록 CSS 클래스 대신 한 번짜리 애니메이션
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      inputRef.current?.animate(
        { translate: ["0", "-6px", "6px", "-4px", "4px", "0"] },
        { duration: 300, easing: "ease-out" },
      );
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (checking) return;
    // IME 조합 중 maxLength를 넘는 브라우저가 있어 한 번 더 자름
    const value = String(new FormData(e.currentTarget).get("nickname") ?? "")
      .trim()
      .slice(0, NICKNAME_MAX);
    if (!value) return reject("받는 분의 이름을 적어 주세요.");
    // 남의 이름으로 들어오는 장난 방지. 확인에 실패하면(네트워크 등) 막지 않고 회신할 때 DB가 다시 막음
    setChecking(true);
    const taken = await isNicknameTaken(value).catch(() => false);
    setChecking(false);
    if (taken) return reject(NICKNAME_TAKEN);
    // 이름을 적으면 쪽지가 닫히고 바로 스티커가 떨어지며 봉투가 열림
    setNaming(false);
    setNickname(value);
  }

  return (
    <section className={styles.scene} data-leaving={leaving}>
      <h1 className="sr-only">할로윈 저녁 초대장</h1>
      <div className={styles.envelope} data-open={opened}>
        <Image src="/assets/open-letter-envelope.png" alt="" fill sizes="(min-width: 900px) 720px, 100vw" priority />
        <div className={styles.flapGroup}>
          <Image
            src="/assets/top-letter-envelope.png"
            alt=""
            fill
            sizes="(min-width: 900px) 720px, 100vw"
            className={styles.flap}
            priority
          />
          {/* 안내 문구 없이 스티커만: 살짝 흔들려 누를 곳을 알려 줌 */}
          <button
            type="button"
            className={styles.sticker}
            onClick={() => setNaming(true)}
            disabled={opened}
            aria-label="봉인 열기"
          >
            <Image src="/assets/envelope-sticker.png" alt="" width={338} height={392} priority />
          </button>
        </div>
      </div>

      <dialog ref={dialogRef} className={styles.note} onClose={() => setNaming(false)} aria-labelledby="note-to">
        <form className={styles.noteForm} method="dialog" onSubmit={handleSubmit} noValidate>
          <label id="note-to" htmlFor="nickname" className={styles.to}>
            To.<span className="sr-only"> 받는 분 이름</span>
          </label>
          <div className={styles.line}>
            <input
              ref={inputRef}
              id="nickname"
              name="nickname"
              className={styles.input}
              placeholder="성함 또는 별명"
              autoComplete="nickname"
              maxLength={NICKNAME_MAX}
              aria-invalid={error !== null}
              aria-describedby={error ? "nickname-error" : undefined}
              onChange={() => setError(null)}
            />
            <span aria-hidden="true">님께</span>
          </div>
          {error && (
            <p id="nickname-error" className={styles.error} role="alert">
              {error}
            </p>
          )}
          <button type="submit" className={styles.button} aria-disabled={checking}>
            {checking ? "확인 중…" : "봉인 열기"}
          </button>
        </form>
      </dialog>
    </section>
  );
}
