import assert from "node:assert/strict";
import { pdfContainsModel } from "../_shared/datasheetPdf.ts";

function makePdf(text: string): Uint8Array {
  const content = `BT /F1 12 Tf 50 700 Td (${text}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let output = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(output.length);
    output += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) {
    output += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${
    objects.length + 1
  } /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(output);
}

Deno.test("Extract the model from PDF text and reject sibling models", async () => {
  const model = { id: "sample", b: "Universal Robots", m: "UR10e", n: "UR10e" };
  assert.equal(
    await pdfContainsModel(makePdf("UR10e technical datasheet"), model),
    true,
  );
  assert.equal(
    await pdfContainsModel(makePdf("UR20 technical datasheet"), model),
    false,
  );
  assert.equal(
    await pdfContainsModel(makePdf("UR10e technical datasheet"), {
      ...model,
      m: "UR10",
    }),
    false,
  );
  await assert.rejects(() =>
    pdfContainsModel(new TextEncoder().encode("%PDF-invalid"), model)
  );
});
