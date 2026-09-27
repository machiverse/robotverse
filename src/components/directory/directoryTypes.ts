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
  img?: string; // product render file name (fallback image)
  th?: string; // small render file name
}

export const SUPPORT_EMAIL = "support@robotverse.in";

// Real OEM photos, keyed by RobotVerse ID, live in /public/directory/photos.json
// ({ "RVRobot0001": "https://…" }). They take priority over the product renders.
export type PhotoMap = Record<string, string>;

const RENDER_HOST = "https://cdn.robodk.com";

export const renderUrl = (kind: CatalogKind, file: string) =>
  kind === "tools" ? `${RENDER_HOST}/robotlib/tools/${file}` : `${RENDER_HOST}/robot/img/${file}`;

/** Image candidates in priority order: real OEM photo, then product render. */
export const imageCandidates = (kind: CatalogKind, item: CatalogItem, photo: string | undefined, large: boolean) => {
  const renders = (large ? [item.img, item.th] : [item.th, item.img]).filter(Boolean) as string[];
  return [photo, ...renders.map((f) => renderUrl(kind, f))].filter(Boolean) as string[];
};

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
