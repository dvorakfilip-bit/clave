# Clave

Aplikace pro účastníky tanečních festivalů (např. CSSF 2026 – Rovinj). Zadání: [docs/PRD.md](docs/PRD.md).

## Technologie

Next.js 16 (React, PWA) · Supabase (Postgres, Auth, Storage) · Tailwind CSS · Vercel

## Spuštění

```bash
npm install
npm run dev
```

Aplikace běží na http://localhost:3000. Bez nastaveného Supabase zobrazuje ukázkový festival na `/demo-2027`.

## Napojení na Supabase

1. V Supabase otevři **SQL Editor** a spusť obsah [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
2. Zkopíruj `.env.example` jako `.env.local` a doplň hodnoty z *Project Settings → API*.
3. Nahraj ukázková data: `npm run seed`.

## Struktura

- `src/app/` – stránky (`/` platforma, `/[festival]/…` program festivalu)
- `src/components/` – komponenty UI
- `src/lib/` – data, typy, barvy, překlady
- `supabase/migrations/` – databázové schéma a oprávnění (RLS)
- `scripts/` – pomocné skripty (seed)
- `docs/` – PRD a značka
