"use client";

import { useState } from "react";
import { deleteRoom, deleteStyle, reorderRooms, saveRoom, saveStyle } from "@/app/admin/actions";
import { contrast, mix } from "@/lib/color";
import type { FestivalProgram, Room, Style } from "@/lib/types";
import { ColorPicker } from "./ColorPicker";
import { Button, Card, ErrorText, inputCls, useAction } from "./ui";

export function RoomsStylesEditor({ program }: { program: FestivalProgram }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <RoomsCard program={program} />
      <StylesCard program={program} />
    </div>
  );
}

function RoomsCard({ program }: { program: FestivalProgram }) {
  const slug = program.festival.slug;
  const { run, pending, error } = useAction();
  const [name, setName] = useState("");
  const rooms = [...program.rooms].sort((a, b) => a.position - b.position);
  const used = new Set([...program.lessons.map((l) => l.roomId), ...program.parties.map((p) => p.roomId)]);

  function move(index: number, dir: -1 | 1) {
    const ids = rooms.map((r) => r.id);
    [ids[index], ids[index + dir]] = [ids[index + dir], ids[index]];
    run(() => reorderRooms(slug, ids));
  }

  return (
    <Card title="Místnosti">
      <p className="mb-3 text-xs text-muted">Pořadí určuje pořadí sloupců v mřížce programu.</p>
      <ul className="divide-y divide-line">
        {rooms.map((r, i) => (
          <RoomRow
            key={r.id}
            room={r}
            used={used.has(r.id)}
            pending={pending}
            onRename={(n) => run(() => saveRoom(slug, { id: r.id, name: n }))}
            onDelete={() => run(() => deleteRoom(slug, r.id))}
            onUp={i > 0 ? () => move(i, -1) : undefined}
            onDown={i < rooms.length - 1 ? () => move(i, 1) : undefined}
          />
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveRoom(slug, { name }), () => setName(""));
        }}
      >
        <input className={inputCls} placeholder="Název místnosti" value={name} onChange={(e) => setName(e.target.value)} required />
        <Button disabled={pending}>Přidat</Button>
      </form>
      <div className="mt-2">
        <ErrorText error={error} />
      </div>
    </Card>
  );
}

function RoomRow(props: {
  room: Room;
  used: boolean;
  pending: boolean;
  onRename: (name: string) => void;
  onDelete: () => void;
  onUp?: () => void;
  onDown?: () => void;
}) {
  const [name, setName] = useState(props.room.name);
  return (
    <li className="flex items-center gap-2 py-2">
      <input
        className={`${inputCls} flex-1`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name !== props.room.name && props.onRename(name)}
        aria-label="Název místnosti"
      />
      <Button variant="ghost" onClick={props.onUp} disabled={!props.onUp || props.pending} aria-label="Posunout nahoru">
        ↑
      </Button>
      <Button variant="ghost" onClick={props.onDown} disabled={!props.onDown || props.pending} aria-label="Posunout dolů">
        ↓
      </Button>
      <Button
        variant="danger"
        onClick={props.onDelete}
        disabled={props.used || props.pending}
        title={props.used ? "V místnosti jsou lekce nebo párty" : undefined}
      >
        Smazat
      </Button>
    </li>
  );
}

function StylesCard({ program }: { program: FestivalProgram }) {
  const slug = program.festival.slug;
  const { run, pending, error } = useAction();
  const [draft, setDraft] = useState({ name: "", color: "#E45756" });

  return (
    <Card title="Styly">
      <ul className="divide-y divide-line">
        {program.styles.map((s) => (
          <StyleRow
            key={s.id}
            style={s}
            brand={program.festival.colors[0]}
            pending={pending}
            onSave={(v) => run(() => saveStyle(slug, { id: s.id, ...v }))}
            onDelete={() => {
              if (window.confirm(`Smazat styl ${s.name}? Lekce tohoto stylu zůstanou bez stylu.`)) run(() => deleteStyle(slug, s.id));
            }}
          />
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveStyle(slug, draft), () => setDraft({ name: "", color: draft.color }));
        }}
      >
        <ColorPicker value={draft.color} onChange={(color) => setDraft({ ...draft, color })} label="Barva nového stylu" />
        <input className={inputCls} placeholder="Název stylu" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
        <Button disabled={pending}>Přidat</Button>
      </form>
      <div className="mt-2">
        <ErrorText error={error} />
      </div>
    </Card>
  );
}

function StyleRow(props: {
  style: Style;
  brand: string;
  pending: boolean;
  onSave: (v: { name: string; color: string }) => void;
  onDelete: () => void;
}) {
  const [v, setV] = useState({ name: props.style.name, color: props.style.color });
  const dirty = v.name !== props.style.name || v.color.toUpperCase() !== props.style.color.toUpperCase();
  // Varování: barva stylu skoro stejná jako hlavní barva festivalu (PRD 7.3)
  const clash = contrast(v.color, props.brand) < 1.25;
  return (
    <li className="py-2">
      <div className="flex items-center gap-2">
        <ColorPicker value={v.color} onChange={(color) => setV({ ...v, color })} label={`Barva stylu ${v.name}`} />
        <input className={`${inputCls} flex-1`} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} aria-label="Název stylu" />
        <span className="hidden rounded px-2 py-1 text-xs sm:inline" style={{ background: mix(v.color, "#ffffff", 0.84), color: mix(v.color, "#000000", 0.45) }}>
          Ukázka
        </span>
        {dirty ? (
          <Button onClick={() => props.onSave(v)} disabled={props.pending}>
            Uložit
          </Button>
        ) : (
          <Button variant="danger" onClick={props.onDelete} disabled={props.pending}>
            Smazat
          </Button>
        )}
      </div>
      {clash && <p className="mt-1 text-xs text-highlight">Barva je skoro stejná jako hlavní barva festivalu.</p>}
    </li>
  );
}
