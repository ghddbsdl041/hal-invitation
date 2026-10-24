"use client";

import { useEffect, useState, useTransition } from "react";
import { deleteCandidate, getAdminData, login, logout, saveCandidate, saveCategory, saveSettings } from "./actions";
import styles from "./admin.module.scss";

type Data = NonNullable<Awaited<ReturnType<typeof getAdminData>>>;

const KST = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
// timestamptz → datetime-local 입력값(한국 시간)
const toLocalInput = (iso: string) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" }).format(new Date(iso)).replace(" ", "T");

export default function Admin() {
  const [data, setData] = useState<Data | null | undefined>(undefined);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const reload = () => getAdminData().then(setData);
  useEffect(() => {
    getAdminData().then(setData);
  }, []);

  function run(action: () => Promise<unknown>, done = "저장했습니다.") {
    startTransition(async () => {
      try {
        await action();
        setMessage({ ok: true, text: done });
        await reload();
      } catch (e) {
        const text = (e as Error).message;
        setMessage({ ok: false, text: text === "UNAUTHORIZED" ? "다시 로그인해 주세요." : text });
        if (text === "UNAUTHORIZED") setData(null);
      }
    });
  }

  if (data === undefined) return <main className={styles.page}>불러오는 중…</main>;

  if (data === null) {
    return (
      <main className={styles.page}>
        <form
          className={styles.login}
          action={(form) =>
            startTransition(async () => {
              if (await login(String(form.get("password") ?? ""))) await reload();
              else setMessage({ ok: false, text: "비밀번호가 맞지 않습니다." });
            })
          }
        >
          <h1>주최자 로그인</h1>
          <label htmlFor="password">비밀번호</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          <button type="submit" disabled={pending}>
            {pending ? "확인 중…" : "로그인"}
          </button>
          {message && <p className={styles.error} role="alert">{message.text}</p>}
        </form>
      </main>
    );
  }

  const { responses, settings, categories, counts } = data;
  const attending = responses.filter((r) => r.attendance_status === "attending");
  const totalVotes = Object.values(counts).reduce((a, b) => a + b, 0);
  const closed = new Date(settings.voting_deadline!).getTime() <= Date.parse(new Date().toISOString());
  const ranking = categories
    .flatMap((c) => c.food_candidates.map((f) => ({ ...f, category: c.name, votes: counts[f.id] ?? 0 })))
    .sort((a, b) => b.votes - a.votes);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>주최자 관리</h1>
        <button type="button" onClick={() => logout().then(() => setData(null))}>
          로그아웃
        </button>
      </header>
      <p className={styles.status} role="status">
        {pending ? "처리 중…" : message ? <span className={message.ok ? "" : styles.error}>{message.text}</span> : ""}
      </p>

      <section className={styles.card}>
        <h2>
          참석 현황 <small>참석 {attending.length}명 · 불참 {responses.length - attending.length}명</small>
        </h2>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>닉네임</th>
                <th>응답</th>
                <th>도착</th>
                <th>처음 응답</th>
                <th>마지막 수정</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((r) => (
                <tr key={r.ticket_no}>
                  <td>{r.ticket_no}</td>
                  <td>{r.nickname}</td>
                  <td>{r.attendance_status === "attending" ? "참석" : "불참"}</td>
                  <td>{r.arrival_time ?? "-"}</td>
                  <td>{KST.format(new Date(r.created_at))}</td>
                  <td>{KST.format(new Date(r.updated_at))}</td>
                </tr>
              ))}
              {responses.length === 0 && (
                <tr>
                  <td colSpan={6}>아직 응답이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.card}>
        <h2>
          투표 현황 <small>{closed ? "마감됨" : `진행 중 (마감 ${KST.format(new Date(settings.voting_deadline!))})`} · 유효 {totalVotes}표</small>
        </h2>
        <ol className={styles.ranking}>
          {ranking.map((f) => (
            <li key={f.id}>
              <span>
                {f.category} · {f.name}
                {!f.is_active && " (숨김)"}
              </span>
              <strong>{f.votes}표</strong>
            </li>
          ))}
        </ol>
        <p className={styles.hint}>참석자의 표만 집계합니다. 동률이면 주최자가 정합니다.</p>
      </section>

      <section className={styles.card}>
        <h2>행사 정보</h2>
        <form className={styles.form} action={(form) => run(() => saveSettings(form))}>
          <label>
            날짜 <input name="event_date" type="date" defaultValue={settings.event_date!} required />
          </label>
          <label>
            시간 안내 <input name="event_time_label" defaultValue={settings.event_time_label ?? ""} maxLength={100} />
          </label>
          <label>
            장소 이름 <input name="venue_name" defaultValue={settings.venue_name ?? ""} maxLength={100} placeholder="비우면 '함께 정할 예정'으로 표시" />
          </label>
          <label>
            주소 <input name="venue_address" defaultValue={settings.venue_address ?? ""} maxLength={200} />
          </label>
          <label>
            지도 링크 <input name="venue_map_url" type="url" defaultValue={settings.venue_map_url ?? ""} placeholder="https://" />
          </label>
          <label>
            안내 문구 <textarea name="notice" defaultValue={settings.notice ?? ""} maxLength={1000} rows={3} />
          </label>
          <label>
            투표 마감 (한국 시간)
            <input name="voting_deadline" type="datetime-local" defaultValue={toLocalInput(settings.voting_deadline!)} required />
          </label>
          <button type="submit" disabled={pending}>
            행사 정보 저장
          </button>
        </form>
      </section>

      <section className={styles.card}>
        <h2>메뉴 후보</h2>
        {categories.map((c) => (
          <div key={c.id} className={styles.category}>
            <form className={styles.inline} action={(form) => run(() => saveCategory(form))}>
              <input type="hidden" name="id" value={c.id} />
              <input name="name" defaultValue={c.name} aria-label="카테고리 이름" maxLength={30} />
              <label className={styles.check}>
                <input type="checkbox" name="is_active" defaultChecked={c.is_active} /> 표시
              </label>
              <button type="submit" disabled={pending}>
                저장
              </button>
            </form>

            {[...c.food_candidates, null].map((f) => (
              <form
                key={f?.id ?? "new"}
                className={styles.candidate}
                action={(form) => run(() => saveCandidate(form), f ? "저장했습니다." : "후보를 추가했습니다.")}
              >
                {f && <input type="hidden" name="id" value={f.id} />}
                <input type="hidden" name="category_id" value={c.id} />
                <input name="name" defaultValue={f?.name ?? ""} placeholder={f ? "" : "새 식당 이름"} aria-label="식당 이름" maxLength={60} />
                <input name="description" defaultValue={f?.description ?? ""} placeholder="설명(선택)" aria-label="설명" maxLength={200} />
                <input name="map_url" type="url" defaultValue={f?.map_url ?? ""} placeholder="카카오맵 링크 https://" aria-label="카카오맵 링크" />
                <label className={styles.check}>
                  <input type="checkbox" name="is_active" defaultChecked={f?.is_active ?? true} /> 표시
                </label>
                <button type="submit" disabled={pending}>
                  {f ? "저장" : "추가"}
                </button>
                {f && (
                  <button
                    type="button"
                    className={styles.danger}
                    disabled={pending}
                    onClick={() => {
                      if (confirm(`'${f.name}'을(를) 삭제할까요? 이 후보에 대한 투표도 함께 지워집니다.`))
                        run(() => deleteCandidate(f.id), "삭제했습니다.");
                    }}
                  >
                    삭제
                  </button>
                )}
              </form>
            ))}
          </div>
        ))}
        <form className={styles.inline} action={(form) => run(() => saveCategory(form), "카테고리를 추가했습니다.")}>
          <input name="name" placeholder="새 카테고리" aria-label="새 카테고리 이름" maxLength={30} />
          <button type="submit" disabled={pending}>
            카테고리 추가
          </button>
        </form>
      </section>
    </main>
  );
}
