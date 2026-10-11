// Researched datasheet sources: official manufacturer PDFs found by web research, per model
// family. Every link is still downloaded and checked by the directory-datasheet function: it must
// be a real PDF on an approved manufacturer domain, and the exact model must appear in its text
// (or its file name). A family PDF therefore only ever attaches to the variants it really lists.
import type { DatasheetModel } from "./datasheetPolicy.ts";

/** `match`: a family or model prefix ("IRB 6700" matches "IRB 6700-200/2.60", not "IRB 67000"). */
export type DatasheetSource = { match: string; urls: string[] };

export const DATASHEET_SOURCES: Record<string, DatasheetSource[]> = {
  ABB: [
    { match: "IRB 1200", urls: ["https://library.e.abb.com/public/6f866d55894a49a7b44384db76e01b4b/IRB1200_ROB0275EN_A.pdf", "https://library.e.abb.com/public/05bae8b556a5471595b1d0e4a76104eb/3HAC046982%20PS%20IRB%201200%20on%20IRC5-en.pdf?x-sign=Y8qWy5iWfYyvEFCVxFqybP7qM2l2y+HVr4oQLCXQ2NuIP9SxMBT2PcCNsl18nAhy"] },
    { match: "IRB 2600", urls: ["https://library.e.abb.com/public/a0e90912800f4ad2abfd1074e776aff4/Datenblatt_IRB2600_lowres.pdf?x-sign=Q0xwjalRH4qPqZzKyEkq8ZcUkmXGYJJnFaMShS1dt5ugTNrI9xsBaX16DGF2NKbQ", "https://library.e.abb.com/public/b158e2dcf8cc41b4a724eda1e22f87fb/3HAC035959%20PS%20IRB%202600%20on%20IRC5-en.pdf?x-sign=eFRwr5bvYiYCuEE4CG4KiECtDFV04Kg5PKLCzDcjMSxYVjaHCAKzABWVK1nMhLfV"] },
    { match: "IRB 2600ID", urls: ["https://library.e.abb.com/public/b158e2dcf8cc41b4a724eda1e22f87fb/3HAC035959%20PS%20IRB%202600%20on%20IRC5-en.pdf?x-sign=eFRwr5bvYiYCuEE4CG4KiECtDFV04Kg5PKLCzDcjMSxYVjaHCAKzABWVK1nMhLfV"] },
    { match: "IRB 4600", urls: ["https://library.e.abb.com/public/c97516887a8646968b6c339ad61c128a/IRB4600_ROB0109EN_J_datasheet-Rev.L.pdf?x-sign=d4kbQSGuUJ3FGc1cWKYcVpEGyoTMSUNP6nl7GUL7lqnm03k3qZW0KDftuphkd2oN", "https://library.e.abb.com/public/e8aea76a73a738e1c1257b130057a58c/ROB0109EN_F%20LR.pdf?x-sign=tjMiUCykhE+yfExS8a6WSmFiS7JnGRJ5rx7SWIEe8z4U2mUqMDBTXeTs5eSAMGgO"] },
    { match: "IRB 6640", urls: ["https://library.e.abb.com/public/7816f710075145eeafed025d636b5520/IRB6640-ROB001EN-Rev.L.pdf", "https://library.e.abb.com/public/1c8cd7d860ec46f7b4254c03dd238dd8/3HAC028284%20PS%20IRB%206640-en.pdf"] },
    { match: "IRB 6640ID", urls: ["https://library.e.abb.com/public/1c8cd7d860ec46f7b4254c03dd238dd8/3HAC028284%20PS%20IRB%206640-en.pdf"] },
    { match: "IRB 7600", urls: ["https://library.e.abb.com/public/149ea673a73f43da93bdc9caacf56ec9/IRB7600_datasheet_20231206.pdf", "https://library.e.abb.com/public/915cf53db781b841c1257b4400523bc8/Datasheet%20IRB%207600.pdf", "https://library.e.abb.com/public/ba5b8ead8d7b142fc1257b130057a5c4/PR10074%20EN_R9%20HR.pdf"] },
    { match: "IRB 1600", urls: ["https://library.e.abb.com/public/d2aab84b6958416689aaac343a6b0285/IRB+1600+datasheet_20240726.pdf?x-sign=CQVt1pKZ0N/jgJhJiOVkEIpmFh7kexNd4Z55VxR5kdgRXZAZhdWP8kd0LkEXCNrY", "https://library.e.abb.com/public/5fe2ad8dd07dd63bc1257b59004fd8aa/IRB%201600%20PR10282%20EN_R5.pdf", "https://library.e.abb.com/public/818d1922d857a640c1257cc500449f38/Product%20specifications_IRB1600_3HAC023604-001_revM_en.pdf"] },
    { match: "IRB 1600ID", urls: ["https://library.e.abb.com/public/696ac7757d994576a5ce71bc022a3056/3HAC023604%20PS%20IRB%201600-1660%20on%20IRC5-en.pdf?x-sign=RxKvRBOQUih8CpWkW2Nra6buSsI3SMqovxyT6YW9aAEzuGXGCGmHHYEzmz4ggSZF"] },
    { match: "IRB 6700", urls: ["https://library.e.abb.com/public/a2698bc8d34a36a048257d4000330712/IRB_6700_EN.pdf", "https://library.e.abb.com/public/3963df8a9b254840b2d73e0a173daddf/3HAC044265%20PS%20IRB%206700%20on%20IRC5-en.pdf?x-sign=G9Xh04l8v0QgrTS9fv7VISj0NSuiQE3E5HHA1oOTFkljaLUz4Sb0xSBK2HCrVkge"] },
  ],
};

const slug = (text: string) => text.toLowerCase().normalize("NFKC").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Researched PDFs for this model: exact-model entries first, then the longest family match. */
export function researchedUrls(item: DatasheetModel): string[] {
  const model = slug(item.m);
  const hits = (DATASHEET_SOURCES[item.b] ?? [])
    .map((source) => ({ source, key: slug(source.match) }))
    .filter(({ key }) => key && (model === key || (model.startsWith(key) && model[key.length] === "-")))
    .sort((a, b) => b.key.length - a.key.length);
  return [...new Set(hits.flatMap(({ source }) => source.urls))];
}
