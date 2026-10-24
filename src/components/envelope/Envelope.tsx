"use client";

import Image from "next/image";
import styles from "./Envelope.module.scss";

export default function Envelope() {
  return (
    <section className={styles.scene}>
      <div className={styles.envelope}>
        <Image src="/assets/open-letter-envelope.png" alt="" fill sizes="480px" priority />
        <Image
          src="/assets/top-letter-envelope.png"
          alt=""
          fill
          sizes="480px"
          className={styles.flap}
          priority
        />
        <Image
          src="/assets/envelope-sticker.png"
          alt=""
          width={338}
          height={392}
          className={styles.sticker}
          priority
        />
      </div>

      {/* shortcut: 제출 동작 없음, 닉네임 검증·화면 전환 작업에서 구현 */}
      <form className={styles.card} onSubmit={(e) => e.preventDefault()}>
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
        />
        <button type="submit" className={styles.button}>
          수신인 확인하기
        </button>
      </form>
    </section>
  );
}
