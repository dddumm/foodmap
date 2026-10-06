import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 사진을 저장할 Storage 버킷 이름
export const PHOTO_BUCKET = 'place-photos'

// 환경변수가 아직 없으면 null — App에서 안내 메시지를 띄움
export const supabase = url && anonKey ? createClient(url, anonKey) : null

export const isSupabaseReady = Boolean(supabase)
