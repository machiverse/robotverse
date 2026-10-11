import { getDocumentProxy } from "npm:unpdf@0.12.1";
import { matchesModel, type DatasheetModel } from "./datasheetPolicy.ts";

/**
 * Readable text of a PDF's first pages, normalised (NFKC turns look-alikes such as "／" into
 * plain characters). Each page appears twice: runs joined with spaces and without, because PDFs
 * often split one word into several runs ("M-2" + "0iD/25"). Few pages keep the edge function
 * inside its CPU limit; spec tables are near the front.
 */
export async function pdfText(bytes: Uint8Array, maxPages = 8): Promise<string> {
  const pdf = await getDocumentProxy(bytes, { isEvalSupported: false });
  try {
    const out: string[] = [];
    for (let number = 1; number <= Math.min(pdf.numPages, maxPages); number++) {
      const page = await pdf.getPage(number);
      const parts = (await page.getTextContent()).items.map((part) => "str" in part ? part.str.normalize("NFKC") : " ");
      out.push(parts.join(" "), parts.join(""));
      page.cleanup();
    }
    return out.join("\n");
  } finally { await pdf.destroy(); }
}

/** Confirm the model appears in PDF text, rather than trusting a search title. */
export async function pdfContainsModel(bytes: Uint8Array, item: DatasheetModel): Promise<boolean> {
  // Scanned PDFs without readable model text require manual review.
  return matchesModel(await pdfText(bytes, 6), item.m);
}
