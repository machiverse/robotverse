import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cleanPhone, KINDS, notesOf, validate } from "../supabase/functions/_shared/leads";
import { proposalHtml, proposalSummary } from "../src/features/automation3d/studioProposal";
import { getBlueprint } from "../src/data/automationStudioIndustries";
import { analyzeDescription } from "../src/utils/processAnalyzer";

// WhatsApp numbers: Indian 10-digit in any common format, or a full international number.
assert.equal(cleanPhone("98765 43210"), "+919876543210");
assert.equal(cleanPhone("+91 98765-43210"), "+919876543210");
assert.equal(cleanPhone("09876543210"), "+919876543210");
assert.equal(cleanPhone("+49 151 2345 6789"), "+4915123456789");
assert.equal(cleanPhone("12345"), null);

// An enquiry needs a name and a way to reply; bots that fill the hidden field are refused.
const contact = { name: "Ravi Kumar", phone: "9876543210", company: "RK Fab", city: "Chennai" };
assert.match(validate({ kind: "engineer", source: "x", contact: { name: "R" } }).error!, /name/);
assert.match(validate({ kind: "engineer", source: "x", contact: { name: "Ravi" } }).error!, /WhatsApp|email/);
assert.ok(validate({ kind: "engineer", source: "x", contact: { name: "Ravi", email: "ravi@rkfab.in" } }).lead);
assert.ok(validate({ kind: "engineer", source: "x", contact, website: "spam" }).error);
assert.ok(validate({ kind: "nope" as never, source: "x", contact }).error);
for (const kind of Object.keys(KINDS)) assert.ok(validate({ kind: kind as keyof typeof KINDS, source: "x", contact }).lead, kind);

// Context is kept short and readable in the CRM notes.
{
  const { lead } = validate({
    kind: "quote",
    source: "cell-builder",
    contact,
    message: "Need it by March",
    item: { name: "2 robot cells" },
    details: { cells: ["Cell 1 — MIG welding | Robot: ABB IRB 2600ID", "Cell 2 — Palletizing"], partsPerHour: 120, huge: "x".repeat(5000) },
  });
  const notes = notesOf(lead!);
  assert.match(notes, /Need it by March/);
  assert.match(notes, /cells: Cell 1 — MIG welding \| Robot: ABB IRB 2600ID; Cell 2 — Palletizing/);
  assert.match(notes, /partsPerHour: 120/);
  assert.ok(notes.length < 6100 && !notes.includes("x".repeat(700)), "long fields are clipped");
}

// The proposal states what it is and escapes what the visitor typed.
{
  const blueprint = getBlueprint("automotive");
  const brief = "Weld <b>brackets</b> & palletize";
  const processes = analyzeDescription(brief, "automotive");
  const html = proposalHtml({ brief, industry: blueprint, processes, inventory: [] });
  assert.ok(html.includes("Weld &lt;b&gt;brackets&lt;/b&gt; &amp; palletize"));
  assert.match(html, /conceptual plan, not an engineering design/);
  assert.match(html, /not stock on hand/);
  assert.ok(Array.isArray(proposalSummary({ brief, industry: blueprint, processes, inventory: [] }).stations));
}

// The fix list: no dead-end buttons, no fake stock, no email-only enquiries, one canonical host.
const studio = readFileSync("src/pages/AutomationStudio.tsx", "utf8");
assert.ok(!/coming soon/i.test(studio) && !studio.includes('p.robot.stock === "In Stock"'));
assert.ok(studio.includes('kind={lead ?? "engineer"}'));
for (const f of ["src/components/directory/DirectoryCatalog.tsx", "src/components/directory/DirectoryItemDialog.tsx", "src/pages/DirectoryModelPage.tsx", "src/components/directory/TrainingDirectory.tsx", "src/components/directory/PartsDirectory.tsx", "src/components/directory/RobotComponents.tsx"])
  assert.ok(!/mailto|enquiryMailto|listTrainingMailto/.test(readFileSync(f, "utf8")), `${f} uses the enquiry form`);
for (const f of ["src/utils/blogSeo.ts", "src/utils/seo.ts", "src/pages/Directory.tsx", "src/pages/RobotDetails.tsx", "src/pages/SparePartDetails.tsx"])
  assert.ok(!readFileSync(f, "utf8").includes("https://robotverse.in"), `${f} uses www`);
assert.ok(!readFileSync("src/pages/dashboard/Credits.tsx", "utf8").includes("100% Genuine"));
console.log("lead capture and fix list: ok");
