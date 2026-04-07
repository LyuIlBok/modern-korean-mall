import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// 일반 클라이언트 (Client-side 및 public RLS 대응)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 관리자용 클라이언트 (Server-side 전용)
 * - RLS를 우회하여 모든 데이터에 접근 가능하므로 보안에 각별히 유의해야 합니다.
 * - 절대 브라우저(Client Component)에서 사용하지 마십시오.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
