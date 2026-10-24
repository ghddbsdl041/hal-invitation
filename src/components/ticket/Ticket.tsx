"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { saveTicketImage } from "@/lib/saveTicketImage";
import type { ArrivalTime } from "@/lib/event";
import styles from "./Ticket.module.scss";

type Props = {
  nickname: string;
  arrival: ArrivalTime;
  eventDate: string;
  venueName: string | null;
  ticketNo: string;
  onEdit: () => void;
  onVote: () => void;
  onNext: () => void;
};

const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

function formatDate(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

function formatTime(time: ArrivalTime) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export default function Ticket({ nickname, arrival, eventDate, venueName, ticketNo, onEdit, onVote, onNext }: Props) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function save() {
    setSaving(true);
    setError(false);
    try {
      await saveTicketImage(ticketRef.current!, `halloween-dinner-ticket-${eventDate}.png`);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={styles.scene}>
      <h1 className="sr-only">참석 티켓</h1>

      {/* PNG로 저장되는 영역: 호박이 티켓 밖으로 튀어나온 만큼 여백 포함, 배경 투명 */}
      <div ref={ticketRef} className={styles.capture}>
        {/* 절취선 홈 마스크에 잘리지 않도록 티켓 밖(저장 영역 안)에 둠 */}
        <Image src="/assets/pumpkin2.png" alt="" width={500} height={500} className={styles.pumpkin} />
        <div className={styles.ticket}>
          <div className={styles.main}>
            <div className={styles.moon} aria-hidden="true" />
            <Image src="/assets/bat2.png" alt="" width={330} height={212} className={styles.bat2} />
            <Image src="/assets/bat1.png" alt="" width={240} height={198} className={styles.bat1} />
            <Image src="/assets/bat3.png" alt="" width={216} height={156} className={styles.bat3} />
            <Image src="/assets/house.png" alt="" width={202} height={252} className={styles.house} />

            <p className={styles.title}>
              HAPPY HALLOWEEN
              <br />
              DINNER PARTY
            </p>
            <p className={styles.holder}>
              <span className={styles.nickname}>{nickname}</span>&rsquo;S TICKET
            </p>
            <dl className={styles.info}>
              <dt className="sr-only">날짜</dt>
              <dd className={styles.date}>{formatDate(eventDate)}</dd>
              <dt className="sr-only">도착 예정</dt>
              <dd className={styles.arrival}>ARRIVAL {formatTime(arrival)}</dd>
              <dt className="sr-only">장소</dt>
              <dd className={styles.venue}>{venueName ?? "장소는 추후 안내드립니다"}</dd>
            </dl>
          </div>

          <div className={styles.stub}>
            <p className={styles.no}>No. {ticketNo}</p>
            <p className={styles.stubText}>
              FREE
              <br />
              ADMISSION
            </p>
            <p className={styles.stubText}>
              PAY LATER
              <br />
              MEAL COST
            </p>
            <Image src="/assets/ghosts.png" alt="" width={772} height={536} className={styles.ghosts} />
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={save} disabled={saving}>
          {saving ? "저장 중…" : "티켓 저장"}
        </button>
        <button type="button" className={styles.button} onClick={onEdit}>
          응답 수정
        </button>
        <button type="button" className={styles.link} onClick={onVote}>
          메뉴 투표하러 가기 →
        </button>
        <button type="button" className={styles.link} onClick={onNext}>
          마지막 화면으로 →
        </button>
      </div>
      <p className={styles.error} role="alert">
        {error && "티켓 이미지를 저장하지 못했습니다. 다시 시도해 주세요."}
      </p>
    </section>
  );
}
