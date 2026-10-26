"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [opened, setOpened] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // 사용자가 이미 입력하기 시작했으면 덮어쓰지 않음
    if (savedNickname && inputRef.current && !inputRef.current.value) inputRef.current.value = savedNickname;
  }, [savedNickname]);

  useEffect(() => {
    if (!opened || nickname === null) return;
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
  }, [opened, nickname, onOpened]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // IME 조합 중 maxLength를 넘는 브라우저가 있어 한 번 더 자름
    const value = String(new FormData(e.currentTarget).get("nickname") ?? "")
      .trim()
      .slice(0, NICKNAME_MAX);
    if (!value) {
      setError(true);
      // 비운 채로 다시 눌러도 매번 흔들리도록 CSS 클래스 대신 한 번짜리 애니메이션
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        inputRef.current?.animate(
          { translate: ["0", "-6px", "6px", "-4px", "4px", "0"] },
          { duration: 300, easing: "ease-out" },
        );
      }
      return;
    }
    setNickname(value);
  }

  function open() {
    setOpened(true);
  }

  const sealReady = nickname !== null && !opened;

  return (
    <section className={styles.scene} data-leaving={leaving}>
      <div className={styles.envelope} data-open={opened}>
        <Image src="/assets/open-letter-envelope.png" alt="" fill sizes="560px" priority />
        <div className={styles.flapGroup}>
          <Image
            src="/assets/top-letter-envelope.png"
            alt=""
            fill
            sizes="560px"
            className={styles.flap}
            priority
          />
          <button
            type="button"
            className={styles.sticker}
            onClick={open}
            disabled={!sealReady}
            aria-label="봉인 열기"
          >
            <Image src="/assets/envelope-sticker.png" alt="" width={338} height={392} priority />
          </button>
        </div>
      </div>

      {nickname === null ? (
        // method="dialog": 하이드레이션 전(느린 모바일)에 눌러도 페이지가 새로고침되며 입력이 사라지지 않음
        <form className={styles.card} method="dialog" onSubmit={handleSubmit} noValidate>
          <p className={styles.eyebrow}>A HALLOWEEN INVITATION</p>
          <h1 className={styles.title}>수신인을 확인해 주시겠습니까?</h1>
          <p className={styles.guide}>이름을 알려주시면 특별한 초대장을 전달해 드리겠습니다.</p>
          <label htmlFor="nickname" className="sr-only">
            성함 또는 별명
          </label>
          <input
            ref={inputRef}
            id="nickname"
            name="nickname"
            className={styles.input}
            placeholder="성함 또는 별명을 입력해 주세요"
            autoComplete="nickname"
            maxLength={NICKNAME_MAX}
            aria-invalid={error}
            aria-describedby={error ? "nickname-error" : undefined}
            onChange={() => setError(false)}
          />
          {error && (
            <p id="nickname-error" className={styles.error} role="alert">
              수신인의 성함을 적어 주셔야 편지를 전해드릴 수 있습니다.
            </p>
          )}
          <button type="submit" className={styles.button}>
            수신인 확인하기
          </button>
        </form>
      ) : (
        <div className={styles.card}>
          <p className={styles.eyebrow}>A HALLOWEEN INVITATION</p>
          <h1 className={styles.title}>귀하를 위한 봉인이 준비되었습니다.</h1>
          <p className={styles.guide}>손으로 눌러 열어 주십시오. 마법은 지원하지 않습니다.</p>
          <button
            type="button"
            className={styles.button}
            onClick={open}
            disabled={!sealReady}
            autoFocus
          >
            봉인에 손대기
          </button>
        </div>
      )}
    </section>
  );
}
