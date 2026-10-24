"use client";

import { useState } from "react";
import { EVENT } from "@/lib/event";
import Envelope from "./envelope/Envelope";
import Final from "./final/Final";
import Letter from "./letter/Letter";
import Rsvp from "./rsvp/Rsvp";
import type { ArrivalTime } from "./rsvp/ArrivalDialog";
import Ticket from "./ticket/Ticket";

type Response = { status: "attending"; arrival: ArrivalTime } | { status: "declined" };
type Step = "letter" | "ticket" | "final";

// shortcut: 장식용 번호를 닉네임으로 만듦, Supabase 연결 작업에서 응답 id 기반으로 교체
function ticketNo(nickname: string) {
  let h = 0;
  for (const c of nickname) h = (h * 31 + c.codePointAt(0)!) % 10000;
  return `1028-${String(h).padStart(4, "0")}`;
}

export default function Invitation() {
  const [nickname, setNickname] = useState<string | null>(null);
  // shortcut: 응답을 화면 상태에만 보관, Supabase 연결 작업에서 저장
  const [response, setResponse] = useState<Response | null>(null);
  const [step, setStep] = useState<Step>("letter");
  const [editing, setEditing] = useState(false);

  function go(next: Step, edit = false) {
    if (!edit) window.scrollTo(0, 0);
    setEditing(edit);
    setStep(next);
  }

  if (nickname === null) {
    return (
      <Envelope
        onOpened={(name) => {
          window.scrollTo(0, 0);
          setNickname(name);
        }}
      />
    );
  }

  if (step === "ticket" && response?.status === "attending") {
    return (
      <Ticket
        nickname={nickname}
        arrival={response.arrival}
        eventDate={EVENT.date}
        venueName={EVENT.venueName}
        ticketNo={ticketNo(nickname)}
        onEdit={() => go("letter", true)}
        onNext={() => go("final")}
      />
    );
  }

  if (step === "final" && response) {
    return (
      <Final
        attending={response.status === "attending"}
        onShowTicket={() => go("ticket")}
        onEdit={() => go("letter", true)}
      />
    );
  }

  return (
    <Letter nickname={nickname} focusTitle={!editing}>
      <Rsvp
        initialArrival={response?.status === "attending" ? response.arrival : null}
        scrollIntoView={editing}
        onAttend={(arrival) => {
          setResponse({ status: "attending", arrival });
          go("ticket");
        }}
        onDecline={() => {
          setResponse({ status: "declined" });
          go("final");
        }}
      />
    </Letter>
  );
}
