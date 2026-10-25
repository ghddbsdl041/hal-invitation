"use client";

import { useEffect, useState } from "react";
import { cancelVote, castVote, loadMine, loadPublic, submitResponse } from "@/lib/api";
import { formatTicketNo, type SavedResponse } from "@/lib/event";
import EventInfo from "./details/EventInfo";
import FoodBoard from "./details/FoodBoard";
import Envelope from "./envelope/Envelope";
import Final from "./final/Final";
import Letter from "./letter/Letter";
import Rsvp from "./rsvp/Rsvp";
import Ticket from "./ticket/Ticket";
import styles from "./Invitation.module.scss";

type Step = "letter" | "ticket" | "final";
// 편지로 돌아올 때 보여줄 위치
type Focus = "top" | "rsvp" | "food";

export default function Invitation() {
  const [pub, setPub] = useState<Awaited<ReturnType<typeof loadPublic>> | null>(null);
  const [pubError, setPubError] = useState(false);
  const [response, setResponse] = useState<SavedResponse | null>(null);
  const [vote, setVote] = useState<number | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("letter");
  const [focus, setFocus] = useState<Focus>("top");
  const [justAttended, setJustAttended] = useState(false);

  function refreshPublic() {
    setPubError(false);
    loadPublic().then(setPub, () => setPubError(true));
  }

  useEffect(() => {
    loadPublic().then(setPub, () => setPubError(true));
    // 같은 브라우저 세션이면 기존 응답·투표 복원. 실패해도 새로 응답할 수 있으므로 화면은 계속 진행
    loadMine().then(
      (mine) => {
        setResponse(mine.response);
        setVote(mine.vote);
      },
      () => {},
    );
  }, []);

  function go(next: Step, at: Focus = "top", attended = false) {
    if (at === "top") window.scrollTo(0, 0);
    setFocus(at);
    setJustAttended(attended);
    setStep(next);
  }

  if (nickname === null) {
    return (
      <Envelope
        savedNickname={response?.nickname}
        onOpened={(name) => {
          window.scrollTo(0, 0);
          setNickname(name);
        }}
      />
    );
  }

  if (step === "ticket" && response?.attendance_status === "attending" && pub) {
    return (
      <Ticket
        nickname={response.nickname}
        arrival={response.arrival_time!}
        eventDate={pub.settings.event_date}
        venueName={pub.settings.venue_name}
        ticketNo={formatTicketNo(response.ticket_no)}
        onEdit={() => go("letter", "rsvp")}
        onVote={() => go("letter", "food")}
        onNext={() => go("final")}
      />
    );
  }

  if (step === "final" && response) {
    return (
      <Final
        attending={response.attendance_status === "attending"}
        onShowTicket={() => go("ticket")}
        onEdit={() => go("letter", "rsvp")}
      />
    );
  }

  const attending = response?.attendance_status === "attending";

  return (
    <Letter
      nickname={nickname}
      focusTitle={focus === "top"}
      side={
        pub ? (
          <>
            <EventInfo settings={pub.settings} />
            <FoodBoard
              categories={pub.categories}
              counts={pub.counts}
              myVote={attending ? vote : null}
              attending={attending}
              deadline={pub.settings.voting_deadline}
              scrollIntoView={focus === "food"}
              justAttended={justAttended}
              onTicket={() => go("ticket")}
              onVote={async (id) => {
                await castVote(id);
                setVote(id);
                refreshPublic();
              }}
              onCancel={async () => {
                await cancelVote();
                setVote(null);
                refreshPublic();
              }}
            />
          </>
        ) : (
          <p className={styles.status} role={pubError ? "alert" : "status"}>
            {pubError ? "행사 정보를 불러오지 못했습니다. " : "행사 정보를 불러오는 중…"}
            {pubError && (
              <button type="button" className={styles.retry} onClick={refreshPublic}>
                다시 시도
              </button>
            )}
          </p>
        )
      }
    >
      <Rsvp
        saved={response}
        scrollIntoView={focus === "rsvp"}
        onAttend={async (arrival) => {
          setResponse(await submitResponse(nickname, "attending", arrival));
          const canVote =
            pub?.categories.some((c) => c.food_candidates.length > 0) &&
            Date.now() < new Date(pub.settings.voting_deadline).getTime();
          // 투표할 후보가 있으면 메뉴로 먼저 안내하고, 없거나 마감이면 바로 티켓
          if (canVote) go("letter", "food", true);
          else go("ticket");
        }}
        onDecline={async () => {
          setResponse(await submitResponse(nickname, "declined", null));
          setVote(null);
          refreshPublic();
          go("final");
        }}
        onTicket={() => go("ticket")}
      />
    </Letter>
  );
}
