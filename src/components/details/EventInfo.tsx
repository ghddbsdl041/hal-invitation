import { formatEventDate, safeUrl, type EventSettings } from "@/lib/event";
import styles from "./Details.module.scss";

export default function EventInfo({ settings }: { settings: EventSettings }) {
  const mapUrl = safeUrl(settings.venue_map_url);
  return (
    <section className={styles.section} aria-labelledby="event-info">
      <h2 id="event-info" className={styles.heading}>
        만찬 안내
      </h2>
      <dl className={styles.info}>
        <dt>날짜</dt>
        <dd>{formatEventDate(settings.event_date)}</dd>
        <dt>시간</dt>
        <dd>{settings.event_time_label}</dd>
        <dt>장소</dt>
        <dd>
          {settings.venue_name ?? "참석 의사를 확인한 뒤 함께 정할 예정입니다."}
          {settings.venue_address && <span className={styles.sub}>{settings.venue_address}</span>}
          {mapUrl && (
            <a className={styles.mapLink} href={mapUrl} target="_blank" rel="noopener noreferrer">
              지도 보기
            </a>
          )}
        </dd>
      </dl>
      {settings.notice && <p className={styles.notice}>{settings.notice}</p>}
    </section>
  );
}
