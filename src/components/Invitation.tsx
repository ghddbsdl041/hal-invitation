"use client";

import { useState } from "react";
import Envelope from "./envelope/Envelope";
import Letter from "./letter/Letter";

export default function Invitation() {
  const [nickname, setNickname] = useState<string | null>(null);

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
  return <Letter nickname={nickname} />;
}
