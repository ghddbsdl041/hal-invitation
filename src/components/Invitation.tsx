"use client";

import { useState } from "react";
import Envelope from "./envelope/Envelope";
import Letter from "./letter/Letter";
import Rsvp from "./rsvp/Rsvp";
import type { ArrivalTime } from "./rsvp/ArrivalDialog";

type Response = { status: "attending"; arrival: ArrivalTime } | { status: "declined" };

export default function Invitation() {
  const [nickname, setNickname] = useState<string | null>(null);
  // shortcut: 응답을 화면 상태에만 보관, Supabase 연결 작업에서 저장
  const [response, setResponse] = useState<Response | null>(null);

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
  return (
    <Letter nickname={nickname}>
      <Rsvp
        initialArrival={response?.status === "attending" ? response.arrival : null}
        onAttend={(arrival) => setResponse({ status: "attending", arrival })}
        onDecline={() => setResponse({ status: "declined" })}
      />
    </Letter>
  );
}
