import { toBlob } from "html-to-image";

// html-to-image는 쓰인 글꼴의 @font-face를 전부 넣어서, 한글 글꼴(조각 190여 개, 약 3MB)을 다 받게 됨.
// 노드에 실제로 쓰인 글자가 들어 있는 unicode-range 조각만 골라 data URL로 넣음
async function fontEmbedCSS(node: HTMLElement) {
  const chars = new Set(Array.from(node.innerText.replace(/\s/g, "")).map((c) => c.codePointAt(0)!));
  const inRange = (range: string) =>
    !range ||
    range.split(",").some((part) => {
      const [lo, hi = lo] = part.trim().replace(/^U\+/i, "").split("-");
      const [a, b] = [parseInt(lo.replace(/\?/g, "0"), 16), parseInt(hi.replace(/\?/g, "F"), 16)];
      for (const c of chars) if (c >= a && c <= b) return true;
      return false;
    });

  const rules = Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules);
      } catch {
        return [];
      }
    })
    .filter((r): r is CSSFontFaceRule => r instanceof CSSFontFaceRule)
    .filter((r) => inRange(r.style.getPropertyValue("unicode-range")));

  const css = await Promise.all(
    rules.map(async (rule) => {
      const url = rule.style.getPropertyValue("src").match(/url\(["']?([^"')]+)["']?\)/)?.[1];
      if (!url) return "";
      // next/font의 src는 CSS 파일 기준 상대 경로(../media/…)라 시트 주소로 풀어야 함
      const base = rule.parentStyleSheet?.href ?? location.href;
      const res = await fetch(new URL(url, base));
      if (!res.ok) throw new Error(`글꼴을 불러오지 못했습니다: ${url}`);
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      return rule.cssText.replace(url, dataUrl);
    }),
  );
  return css.join("\n");
}

export async function saveTicketImage(node: HTMLElement, fileName: string) {
  const blob = await toBlob(node, {
    pixelRatio: 2,
    fontEmbedCSS: await fontEmbedCSS(node),
    // next/image 주소는 모두 /_next/image?url=… 이라 쿼리를 빼면 캐시가 첫 이미지로 덮어씀
    includeQueryParams: true,
  });
  if (!blob) throw new Error("티켓 이미지를 만들지 못했습니다.");
  const file = new File([blob], fileName, { type: "image/png" });

  // 모바일은 공유 시트(사진에 저장)가 다운로드보다 자연스러움. 데스크톱(macOS Chrome 등)은 바로 다운로드
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
