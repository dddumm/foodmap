-- ============================================================
-- 우리 맛집지도 : Supabase 초기 설정 SQL
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 RUN 하세요.
-- ============================================================

-- 1) 맛집 테이블
create table if not exists public.places (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  address      text,
  road_address text,
  category     text,
  phone        text,
  place_url    text,
  lat          double precision not null,
  lng          double precision not null,
  review       text,
  ratings      jsonb not null default '{}'::jsonb,   -- {taste, cleanliness, composition, menu, service}
  photos       jsonb not null default '[]'::jsonb,   -- 사진 URL 배열
  author       text,                                 -- '나' 또는 '남편'
  created_at   timestamptz not null default now()
);

-- 2) 실시간 동기화 켜기 (둘이 같이 보기) — 이미 등록돼 있으면 조용히 넘어감
do $$
begin
  alter publication supabase_realtime add table public.places;
exception
  when duplicate_object then null;
end $$;

-- 3) 접근 정책 (둘만 쓰는 비공개 앱이라 anon 키로 전체 허용)
alter table public.places enable row level security;
drop policy if exists "allow all" on public.places;
create policy "allow all" on public.places
  for all using (true) with check (true);

-- 4) 사진 저장용 Storage 버킷
insert into storage.buckets (id, name, public)
values ('place-photos', 'place-photos', true)
on conflict (id) do nothing;

-- 5) Storage 접근 정책
drop policy if exists "photos read"   on storage.objects;
drop policy if exists "photos upload" on storage.objects;
drop policy if exists "photos delete" on storage.objects;

create policy "photos read"   on storage.objects
  for select using (bucket_id = 'place-photos');
create policy "photos upload" on storage.objects
  for insert with check (bucket_id = 'place-photos');
create policy "photos delete" on storage.objects
  for delete using (bucket_id = 'place-photos');
