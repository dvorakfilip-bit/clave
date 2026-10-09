"use client";

import Papa from "papaparse";
import { readSheet } from "read-excel-file/browser";
import writeXlsxFile from "write-excel-file/browser";
import type { Cell } from "./format";

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** XLSX: všechny buňky jako text, aby Excel nepřevedl časy a data na čísla. */
export async function downloadXlsx(table: string[][], fileName: string) {
  const data = table.map((row, i) => row.map((value) => ({ value, type: String, fontWeight: i === 0 ? ("bold" as const) : undefined })));
  const blob = await writeXlsxFile(data, {
    sheet: "Program",
    stickyRowsCount: 1,
    columns: [38, 8, 12, 9, 9, 16, 12, 28, 28, 7, 28, 30, 30].map((width) => ({ width })),
  }).toBlob();
  download(blob, fileName);
}

/** CSV se středníkem a BOM – český Excel ho otevře správně včetně diakritiky. */
export function downloadCsv(table: string[][], fileName: string) {
  const csv = Papa.unparse(table, { delimiter: ";" });
  download(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), fileName);
}

/** Načte XLSX nebo CSV jako tabulku buněk. */
export async function readTable(file: File): Promise<Cell[][]> {
  if (/\.xlsx$/i.test(file.name)) {
    return (await readSheet(file)) as Cell[][];
  }
  const text = (await file.text()).replace(/^﻿/, "");
  const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
  return result.data;
}
