import { getDocumentProxy } from "npm:unpdf@0.12.1";
import { matchesModel, type DatasheetModel } from "./datasheetPolicy.ts";

/** Confirm the model appears in PDF text, rather than trusting a search title. */
export async function pdfContainsModel(bytes: Uint8Array, item: DatasheetModel): Promise<boolean> {
  const pdf = await getDocumentProxy(bytes, { isEvalSupported: false });
  try {
    // Brochures may cover several models; their spec tables are near the front. Few pages keep
    // the check inside the edge function's CPU limit.
    for (let number = 1; number <= Math.min(pdf.numPages, 6); number++) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      // NFKC turns look-alikes (full-width "／", "Ｍ") into plain characters.
      const parts = content.items.map((part) => "str" in part ? part.str.normalize("NFKC") : " ");
      // PDFs often split one word into several text runs ("M-2" + "0iD/25"), so also
      // check the runs joined without spaces; the model's own boundaries still apply.
      if (matchesModel(parts.join(" "), item.m) || matchesModel(parts.join(""), item.m)) return true;
      page.cleanup();
    }
    return false; // Scanned PDFs without readable model text require manual review.
  } finally { await pdf.destroy(); }
}
