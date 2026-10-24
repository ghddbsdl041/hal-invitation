"use client";

import { useState } from "react";
import Image from "next/image";
import styles from "./Envelope.module.scss";

const NICKNAME_MAX = 20;

export default function Envelope() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [opened, setOpened] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // IME 조합 중 maxLength를 넘는 브라우저가 있어 한 번 더 자름
    const value = String(new FormData(e.currentTarget).get("nickname") ?? "")
      .trim()
      .slice(0, NICKNAME_MAX);
    if (!value) {
      setError(true);
      return;
    }
    setNickname(value);
  }

  // shortcut: 열린 상태에서 멈춤, 편지 화면 작업에서 다음 화면 전환 연결
  function open() {
    setOpened(true);
  }

  const sealReady = nickname !== null && !opened;

  return (
    <section className={styles.scene}>
      <div className={styles.envelope} data-open={opened}>
        <Image src="/assets/open-letter-envelope.png" alt="" fill sizes="480px" priority />
        <div className={styles.flapGroup}>
          <Image
            src="/assets/top-letter-envelope.png"
            alt=""
            fill
            sizes="480px"
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
        <form className={styles.card} onSubmit={handleSubmit} noValidate>
          <p className={styles.eyebrow}>A HALLOWEEN INVITATION</p>
          <h1 className={styles.title}>수신인을 확인해 주시겠습니까?</h1>
          <p className={styles.guide}>이름을 알려주시면 특별한 초대장을 전달해 드리겠습니다.</p>
          <label htmlFor="nickname" className="sr-only">
            성함 또는 별명
          </label>
          <input
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
