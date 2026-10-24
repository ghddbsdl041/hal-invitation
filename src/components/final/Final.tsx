import Image from "next/image";
import styles from "./Final.module.scss";

type Props = {
  attending: boolean;
  onShowTicket: () => void;
  onEdit: () => void;
};

export default function Final({ attending, onShowTicket, onEdit }: Props) {
  return (
    <section className={styles.scene}>
      <div className={styles.sky} aria-hidden="true">
        <div className={styles.moon} />
        <span className={styles.star}>✦</span>
        <span className={styles.star}>✧</span>
        <span className={styles.star}>✦</span>
        <span className={styles.star}>✧</span>
      </div>

      <h1 className={styles.title} tabIndex={-1} ref={(el) => el?.focus({ preventScroll: true })}>
        오늘 하루도 화이팅입니다!
      </h1>
      <p className={styles.sub}>HAPPY Halloween</p>

      <div className={styles.friends} aria-hidden="true">
        <Image src="/assets/pumpkin2.png" alt="" width={500} height={500} className={styles.pumpkin} />
        <Image src="/assets/ghosts.png" alt="" width={772} height={536} className={styles.ghosts} />
      </div>

      <button type="button" className={styles.button} onClick={attending ? onShowTicket : onEdit}>
        {attending ? "티켓 다시 보기" : "응답 수정"}
      </button>
    </section>
  );
}
