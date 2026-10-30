import { describe, expect, it } from "vitest";
import {
  detectDelimiter,
  parseDelimitedPreview,
} from "@/lib/ckan/delimited-preview";

describe("delimited resource preview", () => {
  it("parses quoted commas, escaped quotes and CRLF", () => {
    const input =
      'nama,catatan\r\n"Sekolah, Negeri","Keterangan ""resmi"""\r\n';
    const parsed = parseDelimitedPreview(input);
    expect(parsed.fields.map((field) => field.id)).toEqual(["nama", "catatan"]);
    expect(parsed.records[0]).toMatchObject({
      nama: "Sekolah, Negeri",
      catatan: 'Keterangan "resmi"',
    });
  });

  it("detects TSV and creates safe names for empty/duplicate headers", () => {
    const input = "nama\tkecamatan\tkecamatan\t\nSD\tTempe\tTempe\t1\n";
    expect(detectDelimiter(input)).toBe("\t");
    const parsed = parseDelimitedPreview(input);
    expect(parsed.fields.map((field) => field.id)).toEqual([
      "nama",
      "kecamatan",
      "kecamatan_2",
      "kolom_4",
    ]);
    expect(parsed.records[0].kolom_4).toBe("1");
  });

  it("caps rows and indicates that more content may exist", () => {
    const parsed = parseDelimitedPreview("id,nama\n1,A\n2,B\n3,C\n", {
      maxRows: 2,
    });
    expect(parsed.records).toHaveLength(2);
    expect(parsed.hasMore).toBe(true);
  });
});
