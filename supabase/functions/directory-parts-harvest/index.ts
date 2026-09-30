// supabase/functions/directory-parts-harvest/index.ts
//
// Builds the Directory's "Parts & Components" catalogue: OEM robot parts, end-of-arm tools, sensors,
// cameras, motors, drives, safety devices, cables, software… following the Spare Parts menu taxonomy.
//
// For every (component type, OEM brand) seed it searches the web, reads the product pages (the
// brand's own site first) and asks AI (LOVABLE_API_KEY) to extract ONLY the products and specs that
// are written on those pages. Rows go to public.directory_parts; a product photo from the page is
// resized by wsrv.nl and stored in the public "robot-images" bucket at directory/parts/<id>[-sm].jpg.
//
// POST/GET JSON:
//   { action: "tick" }    -> process the next seeds (called once a minute by pg_cron)
//   { action: "status" }  -> seed progress and product count (anyone)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const BUCKET = "robot-images";
const PARTS = "directory_parts";
const SEEDS = "directory_parts_seeds";
const PER_TICK = 4;

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const service = () => createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
type SB = ReturnType<typeof service>;

/* --------------------------------------------------------------- taxonomy × OEM brands */

type SeedType = { cat: string; sub: string; type: string; brands: string[]; hint?: string };
const S = (cat: string, sub: string, type: string, brands: string[], hint?: string): SeedType => ({ cat, sub, type, brands, hint });

const RP = "Robot Parts", DV = "Devices", TL = "Tools", SW = "Software";
const SEED_TYPES: SeedType[] = [
  // Robot Parts › Controllers & Drives
  S(RP, "Controllers & Drives", "Main Robot Controller", ["FANUC", "ABB", "KUKA", "Yaskawa", "Kawasaki", "Nachi", "Staubli", "Denso", "Epson", "Universal Robots"], "robot controller"),
  S(RP, "Controllers & Drives", "Servo Drives", ["Yaskawa", "Siemens", "Mitsubishi Electric", "Panasonic", "Delta Electronics", "Beckhoff", "Bosch Rexroth", "Kollmorgen", "Omron", "Schneider Electric", "Allen-Bradley", "Lenze"], "servo drive"),
  S(RP, "Controllers & Drives", "PLC Modules", ["Siemens", "Allen-Bradley", "Mitsubishi Electric", "Omron", "Schneider Electric", "Beckhoff", "Delta Electronics", "B&R"], "PLC CPU"),
  S(RP, "Controllers & Drives", "I/O Modules", ["Siemens", "Beckhoff", "WAGO", "Phoenix Contact", "Turck", "Balluff"], "remote I/O module"),
  S(RP, "Controllers & Drives", "Power Supply Units", ["Mean Well", "Phoenix Contact", "PULS", "Siemens", "Omron"], "24V DIN rail power supply"),
  S(RP, "Controllers & Drives", "Safety PLC Modules", ["Pilz", "SICK", "Siemens", "Omron", "Allen-Bradley"], "safety controller"),
  S(RP, "Controllers & Drives", "Motion Controllers", ["Beckhoff", "Omron", "Trio Motion", "Delta Tau", "Yaskawa"], "motion controller"),
  S(RP, "Controllers & Drives", "VFDs", ["ABB", "Siemens", "Danfoss", "Yaskawa", "Mitsubishi Electric", "Delta Electronics", "Schneider Electric"], "variable frequency drive"),
  S(RP, "Controllers & Drives", "Communication Modules", ["HMS Anybus", "Siemens", "Hilscher", "Moxa"], "fieldbus gateway module"),
  // Robot Parts › Motors & Gearboxes
  S(RP, "Motors & Gearboxes", "Servo Motors", ["Yaskawa", "Siemens", "Mitsubishi Electric", "Panasonic", "FANUC", "Delta Electronics", "Beckhoff", "Kollmorgen", "Bosch Rexroth", "Omron", "Allen-Bradley", "Nidec"], "AC servo motor"),
  S(RP, "Motors & Gearboxes", "Planetary Gearboxes", ["Neugart", "WITTENSTEIN alpha", "Apex Dynamics", "SEW-EURODRIVE", "Nidec-Shimpo", "Sumitomo Drive"], "planetary gearbox"),
  S(RP, "Motors & Gearboxes", "Cycloidal Reducers", ["Sumitomo Drive", "Nabtesco", "Spinea"], "cycloidal reducer"),
  S(RP, "Motors & Gearboxes", "RV Reducers", ["Nabtesco"], "RV reducer robot joint"),
  S(RP, "Motors & Gearboxes", "Harmonic Drives", ["Harmonic Drive", "Nidec-Shimpo", "Leaderdrive"], "strain wave gear"),
  S(RP, "Motors & Gearboxes", "Encoders", ["Heidenhain", "Renishaw", "SICK", "Kübler", "Baumer", "Tamagawa", "Nikon"], "rotary encoder"),
  S(RP, "Motors & Gearboxes", "Brakes", ["Mayr", "Kendrion", "Ogura"], "servo motor holding brake"),
  S(RP, "Motors & Gearboxes", "Couplings", ["R+W", "KTR", "Ruland", "Mayr"], "servo coupling"),
  S(RP, "Motors & Gearboxes", "Lubrication Systems", ["SKF", "Lincoln", "Bijur Delimon"], "automatic lubrication system"),
  // Robot Parts › Robot Arms & Motion
  S(RP, "Robot Arms & Motion", "Bearings", ["THK", "SKF", "NSK", "Schaeffler INA", "IKO", "HIWIN"], "cross roller bearing robot"),
  S(RP, "Robot Arms & Motion", "Tracks", ["Güdel", "igus", "HIWIN", "Bosch Rexroth", "THK"], "robot linear track 7th axis"),
  S(RP, "Robot Arms & Motion", "Seals & Bellows", ["Freudenberg", "Trelleborg", "SKF"], "rotary shaft seal"),
  S(RP, "Robot Arms & Motion", "IMU", ["Bosch Sensortec", "Xsens", "VectorNav", "Analog Devices"], "inertial measurement unit"),
  // Robot Parts › Cabling & Connectivity
  S(RP, "Cabling & Connectivity", "High-Flex Cables", ["igus", "LAPP", "HELUKABEL", "Murrplastik"], "robot high flex cable"),
  S(RP, "Cabling & Connectivity", "Encoder Cables", ["igus", "LAPP", "Yaskawa", "Siemens"], "encoder cable"),
  S(RP, "Cabling & Connectivity", "Gateways", ["HMS Anybus", "Moxa", "Siemens", "Hilscher"], "industrial protocol gateway"),
  S(RP, "Cabling & Connectivity", "EtherCAT", ["Beckhoff", "Omron", "Delta Electronics"], "EtherCAT coupler"),
  S(RP, "Cabling & Connectivity", "Profinet", ["Siemens", "Phoenix Contact", "Turck"], "PROFINET switch"),
  // Robot Parts › Power & Batteries
  S(RP, "Power & Batteries", "UPS", ["Phoenix Contact", "PULS", "Siemens", "APC"], "DIN rail UPS"),
  S(RP, "Power & Batteries", "Chargers", ["Delta-Q", "Fronius", "Wiferion"], "AGV AMR battery charger"),
  // Robot Parts › Safety & Enclosures
  S(RP, "Safety & Enclosures", "Safety Relays", ["Pilz", "SICK", "Schneider Electric", "Omron", "Phoenix Contact"], "safety relay"),
  S(RP, "Safety & Enclosures", "Emergency Stop Units", ["Schneider Electric", "Siemens", "Eaton", "IDEC", "Pilz"], "emergency stop"),
  S(RP, "Safety & Enclosures", "Safety Fencing", ["Axelent", "Troax", "Satech", "Brühl"], "machine guarding safety fence"),
  S(RP, "Safety & Enclosures", "Pedestals", ["Bosch Rexroth", "Item", "Güdel"], "robot pedestal riser"),
  // Devices › Sensors & Vision
  S(DV, "Sensors & Vision", "Proximity Sensors", ["SICK", "Omron", "ifm", "Pepperl+Fuchs", "Balluff", "Turck", "Keyence", "Baumer"], "inductive proximity sensor"),
  S(DV, "Sensors & Vision", "Laser Sensors", ["Keyence", "SICK", "Banner", "Micro-Epsilon", "Baumer", "Omron"], "laser displacement sensor"),
  S(DV, "Sensors & Vision", "Force/Torque Sensors", ["ATI Industrial Automation", "Robotiq", "OnRobot", "Schunk", "Kistler", "Bota Systems"], "6-axis force torque sensor robot"),
  S(DV, "Sensors & Vision", "Cameras", ["Basler", "Cognex", "Keyence", "Teledyne FLIR", "IDS Imaging", "Allied Vision", "Hikrobot", "Omron"], "industrial camera"),
  S(DV, "Sensors & Vision", "2D/3D Vision Systems", ["Cognex", "Keyence", "Photoneo", "Zivid", "SICK", "Mech-Mind", "Pickit", "Ensenso", "Omron", "FANUC"], "3D vision system robot"),
  S(DV, "Sensors & Vision", "Barcode Scanners", ["Cognex", "Keyence", "Zebra", "SICK", "Datalogic", "Honeywell"], "fixed industrial barcode reader"),
  S(DV, "Sensors & Vision", "Lighting Systems", ["CCS", "Smart Vision Lights", "Advanced Illumination", "Effilux"], "machine vision light"),
  S(DV, "Sensors & Vision", "Limit Sensors", ["Omron", "Schneider Electric", "Euchner", "Pizzato"], "limit switch"),
  S(DV, "Sensors & Vision", "Safety Laser Scanners", ["SICK", "Keyence", "Omron", "Pilz", "Leuze", "IDEC"], "safety laser scanner"),
  S(DV, "Sensors & Vision", "Safety Light Curtains", ["SICK", "Keyence", "Omron", "Banner", "Leuze", "Pilz"], "safety light curtain"),
  // Devices › HMIs & Teach Devices
  S(DV, "HMIs & Teach Devices", "Teach Pendants", ["FANUC", "ABB", "KUKA", "Yaskawa", "Kawasaki", "Keba"], "robot teach pendant"),
  S(DV, "HMIs & Teach Devices", "HMI Displays", ["Siemens", "Weintek", "Pro-face", "Beijer Electronics", "Omron", "Delta Electronics", "Allen-Bradley"], "HMI touch panel"),
  S(DV, "HMIs & Teach Devices", "Emergency Stop Buttons", ["Schneider Electric", "IDEC", "Eaton", "Siemens"], "emergency stop push button"),
  S(DV, "HMIs & Teach Devices", "Indicators", ["Patlite", "Werma", "Banner", "Schneider Electric"], "signal tower light"),
  // Tools › End Effectors
  S(TL, "End Effectors", "Mechanical Grippers", ["Schunk", "Zimmer Group", "Robotiq", "OnRobot", "Festo", "SMC", "Destaco", "Gimatic", "Weiss Robotics"], "electric parallel gripper"),
  S(TL, "End Effectors", "Vacuum Grippers", ["Schmalz", "Piab", "OnRobot", "Robotiq", "SMC", "Festo", "Schunk"], "vacuum gripper"),
  S(TL, "End Effectors", "Vacuum Cups", ["Schmalz", "Piab", "SMC", "Festo"], "suction cup"),
  S(TL, "End Effectors", "Tool Changers", ["ATI Industrial Automation", "Staubli", "Schunk", "Zimmer Group", "OnRobot", "Destaco"], "robotic tool changer"),
  S(TL, "End Effectors", "Material Handling Attachments", ["Schmalz", "Destaco", "Schunk", "Zimmer Group"], "robot gripper finger jaw"),
  S(TL, "End Effectors", "Collision Sensors", ["ATI Industrial Automation", "Schunk", "Abicor Binzel", "Zimmer Group"], "robot collision sensor"),
  S(TL, "End Effectors", "Screwdriving Units", ["OnRobot", "Atlas Copco", "Desoutter", "Weber", "Deprag"], "robot screwdriver"),
  // Tools › Welding Tools
  S(TL, "Welding Tools", "Welding Torches", ["Abicor Binzel", "Fronius", "Lincoln Electric", "Tregaskiss", "TBi Industries", "Kemppi", "Miller", "Panasonic", "OTC Daihen"], "robotic MIG welding torch"),
  S(TL, "Welding Tools", "Spot Welding Guns", ["Obara", "ARO Welding", "Nimak", "Fronius", "Centerline"], "robot spot welding gun"),
  S(TL, "Welding Tools", "Wire Feeders", ["Fronius", "Lincoln Electric", "Kemppi", "ESAB", "Miller"], "robotic wire feeder"),
  S(TL, "Welding Tools", "Welding Power Sources", ["Fronius", "Lincoln Electric", "Kemppi", "ESAB", "Miller", "Panasonic", "OTC Daihen"], "robotic welding power source"),
  S(TL, "Welding Tools", "Contact Tips", ["Abicor Binzel", "Tregaskiss", "Fronius", "Lincoln Electric"], "welding contact tip"),
  S(TL, "Welding Tools", "Torch Cleaning Stations", ["Abicor Binzel", "Tregaskiss", "Fronius"], "torch cleaning station reamer"),
  S(TL, "Welding Tools", "Arc Monitoring Systems", ["Fronius", "Lincoln Electric", "Kemppi", "ESAB"], "weld monitoring system"),
  // Tools › Processing Tools
  S(TL, "Processing Tools", "Laser Heads", ["Precitec", "Trumpf", "IPG Photonics", "Scansonic", "Laserline"], "laser welding cutting head"),
  S(TL, "Processing Tools", "Spray Guns", ["Graco", "Sames", "Dürr", "Wagner", "Nordson"], "automatic spray gun robot"),
  S(TL, "Processing Tools", "Dispensing Systems", ["Nordson", "Graco", "ViscoTec", "Atlas Copco SCA", "Scheugenpflug"], "robot dispensing system"),
  S(TL, "Processing Tools", "Spindles", ["HSD", "Kessler", "Fischer Precise", "Nakanishi", "ATI Industrial Automation"], "robot machining spindle"),
  S(TL, "Processing Tools", "Polishing Tools", ["FerRobotics", "PushCorp", "ATI Industrial Automation", "3M", "Mirka"], "robotic sanding polishing tool"),
  S(TL, "Processing Tools", "Deburring Tools", ["ATI Industrial Automation", "Schunk", "PushCorp", "Kolver"], "robot deburring tool"),
  S(TL, "Processing Tools", "Cutting Tools", ["Hypertherm", "Kjellberg", "Flow", "KMT Waterjet"], "robotic plasma waterjet cutting"),
  // Tools › Maintenance Tools
  S(TL, "Maintenance Tools", "Grease", ["Kyodo Yushi", "Harmonic Drive", "Nabtesco", "Klüber"], "robot reducer grease"),
  S(TL, "Maintenance Tools", "Lubricants", ["Klüber", "Mobil", "Shell", "Castrol"], "gear oil robot"),
  // Software
  S(SW, "Programming & Simulation", "Offline Programming Software", ["RoboDK", "ABB RobotStudio", "FANUC ROBOGUIDE", "KUKA.Sim", "Yaskawa MotoSim", "Octopuz", "Delfoi", "Visual Components"], "offline robot programming"),
  S(SW, "Programming & Simulation", "Simulation Software", ["Siemens Process Simulate", "Visual Components", "NVIDIA Isaac Sim", "Dassault DELMIA", "RoboDK"], "robot simulation software"),
  S(SW, "Programming & Simulation", "Digital Twin Platforms", ["Siemens", "Dassault Systèmes", "NVIDIA Omniverse", "Rockwell Automation"], "digital twin manufacturing"),
  S(SW, "Programming & Simulation", "Brand-Specific Packages", ["FANUC", "ABB", "KUKA", "Yaskawa"], "robot software option package"),
  S(SW, "Vision & Analytics", "Vision Processing Software", ["Cognex VisionPro", "MVTec HALCON", "Keyence", "Matrox Imaging", "Euresys", "Basler"], "machine vision software"),
  S(SW, "Management & System", "Fleet Management Software", ["MiR", "OTTO Motors", "Locus Robotics", "Formant", "InOrbit"], "robot fleet management"),
  S(SW, "Management & System", "Monitoring & Diagnostics Tools", ["FANUC ZDT", "ABB Ability", "KUKA iiQoT", "Yaskawa Cockpit", "Siemens MindSphere"], "robot condition monitoring"),
  S(SW, "Management & System", "Cloud Platforms", ["Siemens Insights Hub", "AWS IoT", "Microsoft Azure IoT", "PTC ThingWorx"], "industrial IoT platform"),
];

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const brandKey = (b: string) => slug(b.split(/\s+/)[0]);

async function ensureSeeds(sb: SB) {
  const rows = SEED_TYPES.flatMap((t) =>
    t.brands.map((brand) => ({ id: slug(`${t.type}-${brand}`), category: t.cat, subcategory: t.sub, component_type: t.type, brand, status: "pending" })),
  );
  // New seeds added to the list above are queued too; existing ones are left as they are.
  const { count } = await sb.from(SEEDS).select("id", { count: "exact", head: true });
  if ((count ?? 0) >= rows.length) return;
  for (let i = 0; i < rows.length; i += 200) await sb.from(SEEDS).upsert(rows.slice(i, i + 200), { onConflict: "id", ignoreDuplicates: true });
}

/* --------------------------------------------------------------- web */

async function get(url: string, ms = 12000, init: RequestInit = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal, headers: { "User-Agent": UA, "Accept-Language": "en", ...(init.headers ?? {}) } });
  } finally {
    clearTimeout(t);
  }
}
const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");
const SKIP_HOSTS = /amazon\.|ebay\.|aliexpress|alibaba|youtube|facebook|linkedin|pinterest|wikipedia|reddit|indiamart|made-in-china|twitter|x\.com/i;

/** Pages about the query. Bing image results carry the page each image comes from (this works from the
 * server where plain web-search pages are often blocked); DuckDuckGo HTML and Bing web results add more. */
async function webSearch(q: string): Promise<string[]> {
  const out: string[] = [];
  const bi = await get(`https://www.bing.com/images/search?q=${encodeURIComponent(q)}&form=HDRSC2&first=1`).catch(() => null);
  if (bi?.ok) {
    for (const m of (await bi.text()).matchAll(/class="iusc"[^>]*\sm="([^"]+)"/g)) {
      try {
        const meta = JSON.parse(decode(m[1]));
        if (meta.purl) out.push(meta.purl);
      } catch {
        /* skip */
      }
      if (out.length >= 20) break;
    }
  }
  const d = await get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`).catch(() => null);
  if (d?.ok) for (const m of (await d.text()).matchAll(/uddg=([^&"]+)/g)) out.push(decodeURIComponent(m[1]));
  const b = await get(`https://www.bing.com/search?q=${encodeURIComponent(q)}&setlang=en`).catch(() => null);
  if (b?.ok) {
    for (const m of (await b.text()).matchAll(/<h2[^>]*><a[^>]+href="([^"]+)"/g)) {
      let u = decode(m[1]);
      // Bing wraps results in /ck/a?...&u=a1<base64url of the real URL>
      const enc = u.match(/[?&]u=a1([^&]+)/)?.[1];
      if (enc) {
        try {
          u = atob(enc.replace(/-/g, "+").replace(/_/g, "/"));
        } catch {
          continue;
        }
      }
      out.push(u);
    }
  }
  return [...new Set(out)].filter((u) => /^https?:\/\//.test(u) && !/bing\.com|duckduckgo\.com/.test(hostOf(u)) && !SKIP_HOSTS.test(hostOf(u)) && !/\.pdf($|\?)/i.test(u));
}

/** Page text (scripts, styles and markup removed) plus its main image. */
async function readPage(url: string) {
  const r = await get(url, 15000).catch(() => null);
  if (!r?.ok || !(r.headers.get("content-type") ?? "").includes("html")) return null;
  const html = (await r.text()).slice(0, 600_000);
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)?.[1] ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
  const title = decode(html.match(/<title[^>]*>([^<]*)/i)?.[1] ?? "").trim();
  const text = decode(
    html
      .replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|li|tr|h\d|div|td|th)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
    .slice(0, 14000);
  let image: string | null = null;
  try {
    image = og ? new URL(decode(og), url).toString() : null;
  } catch {
    image = null;
  }
  if (image && /logo|icon|favicon|placeholder|default/i.test(image)) image = null;
  return { url, title, text, image };
}

/* --------------------------------------------------------------- AI extraction */

type Product = { model: string; name: string; description?: string; specs?: Record<string, string>; applications?: string[]; compatible_with?: string[] };

/** A real product model: hardware needs a model number; words that only repeat the product type are not a model. */
function goodModel(model: string, seed: { component_type: string; category?: string }) {
  const m = model.trim();
  if (m.length < 3) return false;
  const generic = new Set(`${seed.component_type} module modules unit units system systems series product products tip tips coated standard new kit`.toLowerCase().split(/[^a-z]+/).filter(Boolean));
  const words = m.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (words.every((w) => generic.has(w) || generic.has(w.replace(/s$/, "")))) return false;
  if (seed.category !== "Software" && !/\d/.test(m)) return false;
  if (/^\d{1,3}$/.test(m.replace(/[.\s]/g, ""))) return false; // "035", "20": sizes, not models
  return true;
}

async function extract(seed: { component_type: string; brand: string; category?: string }, page: { url: string; title: string; text: string }): Promise<Product[]> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key || page.text.length < 300) return [];
  const prompt = `You catalogue industrial automation products for a robotics directory.
From the web page text below, list the distinct products made by "${seed.brand}" that are of the type "${seed.component_type}".
Rules:
- ONLY products whose model name/number is written in the page text. Never invent a model or a spec.
- "model" is the manufacturer's model name or number (e.g. "EGP 40", "microScan3", "NT 100-DN-CO"), never a generic phrase like "Communication Module".
- Specs: only values written in the text (e.g. payload, stroke, force, torque, power, speed, resolution, range, protection class, interface, voltage, weight). Keep units.
- "compatible_with": robot brands/models the text says it fits (else empty).
- Skip accessories, spare-part numbers without a product name, and other brands' products.
- At most 15 products. If none qualify, return [].
Reply ONLY with JSON: [{"model":"...","name":"<brand + model + short product type>","description":"<one factual sentence from the text>","specs":{"key":"value"},"applications":["..."],"compatible_with":["..."]}]

Page title: ${page.title}
Page URL: ${page.url}
Page text:
${page.text}`;
  const r = await get("https://ai.gateway.lovable.dev/v1/chat/completions", 45000, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", temperature: 0, max_tokens: 3000, messages: [{ role: "user", content: prompt }] }),
  }).catch(() => null);
  if (r && (r.status === 402 || r.status === 429)) throw new Error(`AI unavailable (${r.status})`);
  if (!r?.ok) return [];
  try {
    const d = await r.json();
    const txt = String(d.choices?.[0]?.message?.content ?? "").replace(/```json|```/g, "");
    const arr = JSON.parse(txt.slice(txt.indexOf("["), txt.lastIndexOf("]") + 1));
    if (!Array.isArray(arr)) return [];
    // Keep only models that really occur in the page text.
    const hay = page.text.toLowerCase().replace(/\s+/g, " ");
    return arr
      .filter((p: Product) => typeof p?.model === "string" && p.model.length <= 80 && goodModel(p.model, seed))
      .filter((p: Product) => hay.includes(p.model.toLowerCase().replace(/\s+/g, " ").trim()))
      .slice(0, 15);
  } catch {
    return [];
  }
}

/* --------------------------------------------------------------- images */

async function storeImage(sb: SB, id: string, src: string) {
  const via = async (w: number, q: number) => {
    const r = await get(`https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${w}&h=${w}&fit=inside&we&output=jpg&q=${q}`, 20000).catch(() => null);
    if (!r?.ok || !(r.headers.get("content-type") ?? "").startsWith("image/")) return null;
    const b = new Uint8Array(await r.arrayBuffer());
    return b.length > 3000 ? b : null;
  };
  const [large, small] = await Promise.all([via(900, 84), via(400, 80)]);
  if (!large || !small) return null;
  const base = `directory/parts/${id}`;
  const up = async (path: string, data: Uint8Array) => {
    const { error } = await sb.storage.from(BUCKET).upload(path, data, { contentType: "image/jpeg", upsert: true, cacheControl: "31536000" });
    if (error) throw error;
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  };
  const v = Date.now().toString(36);
  return { image_url: `${await up(`${base}.jpg`, large)}?v=${v}`, thumb_url: `${await up(`${base}-sm.jpg`, small)}?v=${v}` };
}

/* --------------------------------------------------------------- one seed */

async function processSeed(
  sb: SB,
  seed: { component_type: string; brand: string; category?: string; subcategory?: string; [k: string]: unknown },
  deadline: number,
) {
  const type = SEED_TYPES.find((t) => t.type === seed.component_type);
  const bk = brandKey(seed.brand);
  const queries = [`${seed.brand} ${type?.hint ?? seed.component_type}`, `${seed.brand} ${seed.component_type} specifications datasheet`];
  const urls: string[] = [];
  for (const q of queries) {
    if (Date.now() > deadline) break;
    urls.push(...(await webSearch(q)));
  }
  // The brand's own pages first, then others (distributors) that name the brand.
  const ranked = [...new Set(urls)].sort((a, b) => Number(hostOf(b).includes(bk)) - Number(hostOf(a).includes(bk))).slice(0, 4);
  let found = 0;
  const notes: string[] = [`${ranked.length} pages`];
  // Read and extract all pages at once (each is mostly waiting on the network / AI).
  const results = await Promise.all(
    ranked.map(async (url) => {
      const page = await readPage(url).catch(() => null);
      if (!page) return { url, page: null, products: [] as Product[] };
      return { url, page, products: Date.now() < deadline ? await extract(seed, page) : [] };
    }),
  );
  for (const { url, page, products } of results) {
    if (!page) {
      notes.push(`unreadable ${hostOf(url)}`);
      continue;
    }
    notes.push(`${hostOf(url)}: ${products.length}`);
    for (const p of products) {
      const id = `RVPart-${slug(`${seed.brand}-${p.model}`)}`.slice(0, 120);
      const { data: existing } = await sb.from(PARTS).select("id, image_url").eq("id", id).maybeSingle();
      let img: { image_url: string; thumb_url: string } | null = null;
      // A page about one or two products: its main image shows that product.
      if (!existing?.image_url && page.image && products.length <= 2 && Date.now() < deadline) img = await storeImage(sb, id, page.image).catch(() => null);
      const row = {
        id, category: seed.category, subcategory: seed.subcategory, component_type: seed.component_type,
        brand: seed.brand, model: p.model.trim(), name: (p.name || `${seed.brand} ${p.model}`).trim().slice(0, 200),
        description: p.description?.slice(0, 500) ?? null,
        specs: Object.fromEntries(Object.entries(p.specs ?? {}).slice(0, 16).map(([k, v]) => [String(k).slice(0, 60), String(v).slice(0, 120)])),
        applications: (p.applications ?? []).slice(0, 8).map(String), compatible_with: (p.compatible_with ?? []).slice(0, 12).map(String),
        source_url: url, updated_at: new Date().toISOString(), ...(img ?? {}),
      };
      if (existing) {
        const { image_url: _i, ...rest } = row as Record<string, unknown>;
        await sb.from(PARTS).update(img ? row : rest).eq("id", id);
      } else {
        await sb.from(PARTS).insert(row);
        found++;
      }
    }
  }
  return { found, note: notes.join(" · ").slice(0, 500) };
}

/* --------------------------------------------------------------- server */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = req.method === "GET" ? Object.fromEntries(new URL(req.url).searchParams) : await req.json().catch(() => ({}));
    const action = String(body.action ?? "status");
    const sb = service();

    if (action === "status") {
      const counts: Record<string, number> = {};
      for (const s of ["pending", "working", "done", "error"]) {
        const { count } = await sb.from(SEEDS).select("id", { count: "exact", head: true }).eq("status", s);
        counts[s] = count ?? 0;
      }
      const { count: parts } = await sb.from(PARTS).select("id", { count: "exact", head: true });
      const { data: recent } = await sb.from(SEEDS).select("id, status, found, note").neq("status", "pending").order("updated_at", { ascending: false }).limit(8);
      return json({ seeds: counts, parts: parts ?? 0, recent });
    }

    if (action === "tick") {
      await ensureSeeds(sb);
      // Seeds left "working" by a cut-off run go back to the queue (max 3 tries).
      const stale = new Date(Date.now() - 10 * 60_000).toISOString();
      await sb.from(SEEDS).update({ status: "pending" }).eq("status", "working").lt("updated_at", stale).lt("attempts", 3);
      await sb.from(SEEDS).update({ status: "error", note: "timed out 3 times" }).eq("status", "working").lt("updated_at", stale).gte("attempts", 3);

      // Remove weak rows saved before the model check existed (hardware without a model number).
      await sb.from(PARTS).delete().neq("category", "Software").not("model", "match", "[0-9]");
      // A search that found nothing gets one more try later.
      await sb.from(SEEDS).update({ status: "pending" }).eq("status", "done").eq("found", 0).lt("attempts", 3);
      const { data: next } = await sb.from(SEEDS).select("*").eq("status", "pending").order("attempts").order("id").limit(PER_TICK * 3);
      const deadline = Date.now() + 100_000;
      // Claim up to PER_TICK seeds (another run may have taken some), then work on them side by side.
      const mine: Record<string, any>[] = [];
      for (const seed of next ?? []) {
        if (mine.length >= PER_TICK) break;
        const { data: claimed } = await sb.from(SEEDS)
          .update({ status: "working", attempts: (seed.attempts ?? 0) + 1, updated_at: new Date().toISOString() })
          .eq("id", seed.id).eq("status", "pending").select("id");
        if (claimed?.length) mine.push(seed);
      }
      const done = await Promise.all(
        mine.map(async (seed) => {
          try {
            const r = await processSeed(sb, seed, deadline);
            await sb.from(SEEDS).update({ status: "done", found: r.found, note: r.note, updated_at: new Date().toISOString() }).eq("id", seed.id);
            return { id: seed.id, ...r };
          } catch (e) {
            const msg = String(e instanceof Error ? e.message : e).slice(0, 300);
            // No AI credits / rate limited: put the search back in the queue untouched.
            if (msg.startsWith("AI unavailable")) {
              await sb.from(SEEDS).update({ status: "pending", attempts: seed.attempts ?? 0, note: msg, updated_at: new Date().toISOString() }).eq("id", seed.id);
              return { id: seed.id, paused: true };
            }
            await sb.from(SEEDS).update({ status: "error", note: msg, updated_at: new Date().toISOString() }).eq("id", seed.id);
            return { id: seed.id, error: true };
          }
        }),
      );
      return json({ ok: true, processed: done });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("directory-parts-harvest", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
