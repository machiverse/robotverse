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

// Real product photos, keyed by RobotVerse ID. They come from the
// directory_robot_images table (harvested and stored in our storage) and from
// /public/directory/photos.json, and take priority over the product renders.
export interface Photo {
  img: string;
  sm?: string;
  page?: string | null;
}
export type PhotoMap = Record<string, Photo>;

// Every image is served from RobotVerse's own storage. The directory-image edge
// function copies an image there the first time it is needed (a real OEM photo
// when photos.json has one, otherwise the product render), then storage serves it.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://cmahwgetrqczytnijbuk.supabase.co";

export const storedImageUrl = (kind: CatalogKind, id: string, small: boolean) =>
  `${SUPABASE_URL}/storage/v1/object/public/robot-images/directory/${kind}/${id}${small ? "-sm" : ""}`;

export const imageFunctionUrl = (kind: CatalogKind, item: CatalogItem, small: boolean) => {
  const file = small ? item.th || item.img : item.img || item.th;
  const q = new URLSearchParams({ kind, id: item.id, size: small ? "sm" : "lg" });
  if (file) q.set("file", file);
  return `${SUPABASE_URL}/functions/v1/directory-image?${q}`;
};

/** Image candidates in priority order: real stored photo, our stored render, then copy-on-demand. */
export const imageCandidates = (kind: CatalogKind, item: CatalogItem, photo: Photo | undefined, large: boolean) => [
  ...(photo ? [large ? photo.img : photo.sm || photo.img] : []),
  storedImageUrl(kind, item.id, !large),
  imageFunctionUrl(kind, item, !large),
];

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
