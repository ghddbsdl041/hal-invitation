"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import styles from "./Letter.module.scss";

const PARAGRAPHS = [
  "평안하신지요.",
  "달이 높이 떠오르고 밤공기가 서늘해지는 계절, 귀하와 함께 특별한 저녁을 보내고자 이 편지를 보냅니다.",
  "바쁜 하루의 일과를 마친 뒤 한자리에 모여 맛있는 음식을 나누고, 그간 나누지 못한 이야기를 나누는 것은 참으로 뜻깊은 일이라 생각합니다. 더욱이 이번 만남은 할로윈이 있는 주에 이루어질 예정입니다. 마치 오래전부터 계획된 특별한 밤처럼 느껴지기도 하는군요.",
  "물론, 별도의 장식이나 의상 규정, 유령 섭외 등의 계획은 없습니다. 그저 다 함께 저녁을 먹기에 적절한 날을 살펴보았을 뿐이며, 할로윈은 그 주에 우연히 찾아왔을 따름입니다. 그럼에도 이 편지만큼은 제법 그럴듯한 초대장으로 남겨 두고 싶었습니다.",
  "식사 장소와 메뉴는 참석 의사를 확인한 뒤 함께 정할 예정입니다. 아직 확정된 사항이 많지 않다는 점은 너그러이 양해해 주시기 바랍니다. 다행히도 만찬에 필요한 가장 중요한 조건, 즉 함께 식사할 사람을 모으는 일은 이 편지로 해결할 수 있을 듯합니다.",
  "부디 참석 여부를 알려 주십시오. 귀하의 선택은 전적으로 존중됩니다. 참석하신다면 기쁜 마음으로 맞이하겠습니다. 불참하신다면 그 또한 이해하겠습니다.",
  "참석 여부는 자유롭게 결정해 주십시오. 단, 참석자가 많을수록 메뉴 선정 과정에서 주최자의 부담이 분산될 수 있음을 참고로 알려드립니다.",
  "그날의 식탁이 얼마나 근사할지는 아직 알 수 없으나, 함께할 사람이 있다는 사실만큼은 미리 기뻐해 두겠습니다.",
];

type Props = {
  nickname: string;
  // 응답 수정으로 돌아올 때는 제목 대신 응답 영역으로 포커스를 보냄
  focusTitle?: boolean;
  // 넓은 화면에서 오른쪽 단 (만찬 안내·메뉴)
  side?: ReactNode;
  // 본문 아래 (회신)
  children?: ReactNode;
};

export default function Letter({ nickname, focusTitle = true, side, children }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  // 마운트 때 한 번만 (ref 콜백으로 하면 투표 등으로 다시 그릴 때마다 포커스를 빼앗음)
  useEffect(() => {
    if (focusTitle) titleRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className={styles.scene}>
      {/* 좁은 화면: 종이 한 장(.paper). 넓은 화면: 본문은 가로 편지지, 안내·메뉴·회신은 아래 두 번째 종이(.sheet) */}
      <article className={styles.paper}>
        <div className={`${styles.sheet} ${styles.letterSheet}`}>
          <Image src="/assets/streetlight.png" alt="" width={346} height={721} className={styles.lamp} />
          <Image src="/assets/maple.png" alt="" width={479} height={521} className={styles.maple} />
          <Image src="/assets/pumpkin.png" alt="" width={500} height={500} className={styles.clipping} />
          <Image src="/assets/candlelight.png" alt="" width={375} height={666} className={styles.candle} />
          <Image src="/assets/sticker.png" alt="" width={344} height={376} className={styles.stamp} />

          {/* 봉투에서 넘어왔을 때 스크린리더·키보드 포커스를 편지 시작점으로 */}
          <h1 className={styles.title} tabIndex={-1} ref={titleRef}>
            이 계절의 만찬에 귀하를 초대합니다.
          </h1>
          <div className={styles.body}>
            <p>존경하는 {nickname}님께.</p>
            {PARAGRAPHS.map((text) => (
              <p key={text}>{text}</p>
            ))}
            <p className={styles.closing}>귀하의 답신을 기다리며,</p>
            <p className={styles.sign}>만찬 주최자 올림</p>
          </div>
        </div>
        {(side || children) && (
          <div className={`${styles.sheet} ${styles.replySheet}`}>
            {side}
            {children}
          </div>
        )}
      </article>
    </section>
  );
}
