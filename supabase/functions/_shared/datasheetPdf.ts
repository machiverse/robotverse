import { getDocumentProxy } from "npm:unpdf@0.12.1";
import { matchesModel, type DatasheetModel } from "./datasheetPolicy.ts";

/** Confirm the model appears in PDF text, rather than trusting a search title. */
export async function pdfContainsModel(bytes: Uint8Array, item: DatasheetModel): Promise<boolean> {
  const pdf = await getDocumentProxy(bytes, { isEvalSupported: false });
  try {
    // Brochures may cover several models. Avoid unbounded parsing of large manuals.
    for (let number = 1; number <= Math.min(pdf.numPages, 50); number++) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      const text = content.items.map((part) => "str" in part ? part.str : " ").join(" ");
      if (matchesModel(text, item.m)) return true;
      page.cleanup();
    }
    return false; // Scanned PDFs without readable model text require manual review.
  } finally { await pdf.destroy(); }
}
