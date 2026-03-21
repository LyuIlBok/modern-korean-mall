import { createClient } from '@supabase/supabase-js';

// 이 정보는 유일복님께서 Supabase 프로젝트를 생성하신 뒤 받으실 API 키로 나중에 교체하게 됩니다.
// 현재는 전 세계 배포를 위해 환경 변수(.env)로 관리하도록 세팅하겠습니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);