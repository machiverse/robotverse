import { describe, it, expect } from "vitest";
import { productSentence, sceneBrief } from "../src/features/automation3d/productEvidence";
import { productFor } from "../src/features/automation3d/workpieces.js";

describe("product evidence", () => {
  it("names material, part and finished output", () => {
    expect(productSentence({ name: "housing", material: "aluminium", output: "deburred housing", finish: "anodised" }))
      .toBe("Workpiece: aluminium housing. Finished output: anodised deburred housing");
  });
  it("skips unknown values", () => {
    expect(productSentence({ name: "unknown", material: "unknown" })).toBe("");
    expect(sceneBrief("weld frames", { material: "unknown" })).toBe("weld frames");
  });
  it("extracted product reaches the 3D product choice", () => {
    const plain = productFor("load the machine", ["Machine Tending"]);
    const withEvidence = productFor(sceneBrief("load the machine", { name: "glass bottle", material: "glass" }) ?? "", ["Machine Tending"]);
    expect(withEvidence.key).not.toBe(plain.key);
  });
});
