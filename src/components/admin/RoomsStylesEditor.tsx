"use client";

import { useState } from "react";
import { deleteRoom, deleteStyle, reorderRooms, saveRoom, saveStyle } from "@/app/admin/actions";
import { contrast, mix } from "@/lib/color";
import { useI18n } from "@/lib/i18n";
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
  const { tr } = useI18n();
  const [name, setName] = useState("");
  const rooms = [...program.rooms].sort((a, b) => a.position - b.position);
  const used = new Set([...program.lessons.map((l) => l.roomId), ...program.parties.map((p) => p.roomId)]);

  function move(index: number, dir: -1 | 1) {
    const ids = rooms.map((r) => r.id);
    [ids[index], ids[index + dir]] = [ids[index + dir], ids[index]];
    run(() => reorderRooms(slug, ids));
  }

  return (
    <Card title={tr("Místnosti", "Rooms")}>
      <p className="mb-3 text-xs text-muted">{tr("Pořadí určuje pořadí sloupců v mřížce programu.", "The order sets the column order in the program grid.")}</p>
      <ul className="divide-y divide-line">
        {rooms.map((r, i) => (
          <RoomRow
            // Po přejmenování se řádek načte znovu s názvem z databáze.
            key={`${r.id}:${r.name}`}
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
        <input className={inputCls} placeholder={tr("Název místnosti", "Room name")} value={name} onChange={(e) => setName(e.target.value)} required />
        <Button disabled={pending}>{tr("Přidat", "Add")}</Button>
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
  const { tr } = useI18n();
  const [name, setName] = useState(props.room.name);
  return (
    <li className="flex items-center gap-2 py-2">
      <input
        className={`${inputCls} flex-1`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          // Prázdný název se neukládá – vrátí se původní.
          if (!name.trim()) setName(props.room.name);
          else if (name !== props.room.name) props.onRename(name);
        }}
        aria-label={tr("Název místnosti", "Room name")}
      />
      <Button variant="ghost" onClick={props.onUp} disabled={!props.onUp || props.pending} aria-label={tr("Posunout nahoru", "Move up")}>
        ↑
      </Button>
      <Button variant="ghost" onClick={props.onDown} disabled={!props.onDown || props.pending} aria-label={tr("Posunout dolů", "Move down")}>
        ↓
      </Button>
      <Button
        variant="danger"
        onClick={props.onDelete}
        disabled={props.used || props.pending}
        title={props.used ? tr("V místnosti jsou lekce nebo párty", "The room has classes or parties") : undefined}
      >
        {tr("Smazat", "Delete")}
      </Button>
    </li>
  );
}

function StylesCard({ program }: { program: FestivalProgram }) {
  const slug = program.festival.slug;
  const { run, pending, error } = useAction();
  const { tr } = useI18n();
  const [draft, setDraft] = useState({ name: "", color: "#E45756" });

  return (
    <Card title={tr("Styly", "Styles")}>
      <ul className="divide-y divide-line">
        {program.styles.map((s) => (
          <StyleRow
            key={s.id}
            style={s}
            brand={program.festival.colors[0]}
            pending={pending}
            onSave={(v) => run(() => saveStyle(slug, { id: s.id, ...v }))}
            onDelete={() => {
              if (window.confirm(tr(`Smazat styl ${s.name}? Lekce tohoto stylu zůstanou bez stylu.`, `Delete style ${s.name}? Its classes will be left without a style.`))) run(() => deleteStyle(slug, s.id));
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
        <ColorPicker value={draft.color} onChange={(color) => setDraft({ ...draft, color })} label={tr("Barva nového stylu", "New style color")} />
        <input className={inputCls} placeholder={tr("Název stylu", "Style name")} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
        <Button disabled={pending}>{tr("Přidat", "Add")}</Button>
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
  const { tr } = useI18n();
  const [v, setV] = useState({ name: props.style.name, color: props.style.color });
  const dirty = v.name !== props.style.name || v.color.toUpperCase() !== props.style.color.toUpperCase();
  // Varování: barva stylu skoro stejná jako hlavní barva festivalu (PRD 7.3)
  const clash = contrast(v.color, props.brand) < 1.25;
  return (
    <li className="py-2">
      <div className="flex items-center gap-2">
        <ColorPicker value={v.color} onChange={(color) => setV({ ...v, color })} label={tr(`Barva stylu ${v.name}`, `Style color ${v.name}`)} />
        <input className={`${inputCls} flex-1`} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} aria-label={tr("Název stylu", "Style name")} />
        <span className="hidden rounded px-2 py-1 text-xs sm:inline" style={{ background: mix(v.color, "#ffffff", 0.84), color: mix(v.color, "#000000", 0.45) }}>
          {tr("Ukázka", "Sample")}
        </span>
        {dirty ? (
          <Button onClick={() => props.onSave(v)} disabled={props.pending}>
            {tr("Uložit", "Save")}
          </Button>
        ) : (
          <Button variant="danger" onClick={props.onDelete} disabled={props.pending}>
            {tr("Smazat", "Delete")}
          </Button>
        )}
      </div>
      {clash && <p className="mt-1 text-xs text-highlight">{tr("Barva je skoro stejná jako hlavní barva festivalu.", "The color is almost the same as the festival's primary color.")}</p>}
    </li>
  );
}
