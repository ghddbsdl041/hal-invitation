import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Data API 화면의 주소(…supabase.co/rest/v1/)를 그대로 넣어도 동작하도록 도메인만 사용
export const supabaseUrl = () => new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;

let client: SupabaseClient | null = null;

// 빌드(정적 생성) 시점에는 만들지 않도록 처음 쓸 때 생성
export function supabase() {
  client ??= createClient(supabaseUrl(), process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  return client;
}
