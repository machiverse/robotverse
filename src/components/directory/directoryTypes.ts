// Shapes of the static Directory catalogues served from /public/directory/*.json.
// Short keys keep the files small; see DirectoryCatalog for how they are rendered.

export type CatalogKind = "robots" | "tools" | "axes";

export interface CatalogItem {
  id: string; // RobotVerse ID, e.g. RVRobot0001
  b: string; // brand
  m: string; // model
  n: string; // full name
  t?: string; // robot type (robots only), e.g. "6-Axis", "SCARA"
  c?: string; // category (tools / axes)
  a?: number; // axes
  p?: number; // payload (kg)
  r?: number; // reach / stroke (mm)
  e?: number; // repeatability (mm)
  w?: number; // weight (kg)
  ap?: string[]; // applications
}

export const SUPPORT_EMAIL = "support@robotverse.in";

export const oemPhotoSearchUrl = (item: CatalogItem) =>
  `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${item.n} official product photo`)}`;

export const mailto = (subject: string, body: string) =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const enquiryMailto = (item: CatalogItem) =>
  mailto(
    `Enquiry: ${item.n} (${item.id})`,
    `Hello RobotVerse team,\n\nI'm interested in the ${item.n} (RobotVerse ID ${item.id}).\n\nName:\nCompany:\nPhone:\nRequirement (buy / sell / service / training):\n\nThank you.`,
  );

export const listTrainingMailto = mailto(
  "List my training course / program / workshop on RobotVerse",
  [
    "Hello RobotVerse team,",
    "",
    "Please list our training in the RobotVerse Directory.",
    "",
    "Organisation / institute name:",
    "Course / program / workshop title:",
    "Type (course / program / workshop):",
    "Mode (online / classroom / both):",
    "Location(s):",
    "Duration and fees:",
    "Robot brands / topics covered:",
    "Next batch dates:",
    "Website link:",
    "Contact person, phone and email:",
    "",
    "Thank you.",
  ].join("\n"),
);
