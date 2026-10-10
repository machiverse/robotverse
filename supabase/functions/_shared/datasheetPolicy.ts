export const OEM_SITES: Record<string, string[]> = {
  KUKA: ["kuka.com"], Fanuc: ["fanuc.eu", "fanucamerica.com", "fanuc.co.jp", "fanucindia.com"], ABB: ["abb.com", "library.e.abb.com"],
  "Yaskawa Motoman": ["motoman.com", "yaskawa.eu.com", "yaskawa.com"], Kawasaki: ["kawasakirobotics.com", "kawasakirobot.com"],
  Comau: ["comau.com"], Estun: ["estun.com", "estunrobotics.com"], Mitsubishi: ["mitsubishielectric.com"], Staubli: ["staubli.com"],
  "Techman Robot": ["tm-robot.com"], Omron: ["omron.com", "ia.omron.com", "industrial.omron.eu"], "Hyundai Robotics": ["hyundai-robotics.com"],
  Epson: ["epson.com", "epson.eu"], Brooks: ["brooks.com"], INOVANCE: ["inovance.eu", "inovance.com"], Nachi: ["nachi.com", "nachirobotics.com"],
  Rokae: ["rokae.com"], Dobot: ["dobot-robots.com", "dobot.cc"], Denso: ["densorobotics.com", "denso-wave.com"], AUBO: ["aubo-cobot.com", "aubo-robotics.com"],
  Efort: ["efort.com.cn", "efortrobot.com"], JAKA: ["jaka.com", "jakarobotics.com"], "Doosan Robotics": ["doosanrobotics.com"],
  "Shibaura Machine": ["shibaura-machine.co.jp"], "OTC Daihen": ["otc-daihen.de", "daihen-usa.com"], Siasun: ["siasun.com"], Neura: ["neura-robotics.com"],
  DUCO: ["ducorobots.com"], "Elite Robots": ["eliterobots.com"], "Universal Robots": ["universal-robots.com"], HIWIN: ["hiwin.com", "hiwin.tw"],
  Panasonic: ["panasonic.com"], uFactory: ["ufactory.cc", "ufactory.us"], Kinova: ["kinovarobotics.com"], Flexiv: ["flexiv.com"],
  Yamaha: ["yamaha-motor.com", "global.yamaha-motor.com"], CLOOS: ["cloos.de"], "Kassow Robots": ["kassowrobots.com"],
  "Rainbow Robotics": ["rainbow-robotics.com"], Neuromeka: ["neuromeka.com"], FAIRINO: ["frtech.fr", "fairino.com"], Hanwha: ["hanwharobotics.com"],
  "Delta Electronics": ["deltaww.com"], Schunk: ["schunk.com"], OnRobot: ["onrobot.com"], Robotiq: ["robotiq.com"], Schmalz: ["schmalz.com"],
  Zimmer: ["zimmer-group.com"], Festo: ["festo.com"], Piab: ["piab.com"], ATI: ["ati-ia.com"], Binzel: ["binzel-abicor.com"], Fronius: ["fronius.com"],
  Gudel: ["gudel.com"], "Güdel": ["gudel.com"],
  Franka: ["franka.de", "franka-robotics.com"], Mecademic: ["mecademic.com"],
  igus: ["igus.com", "igus.eu"], "Schneider Electric": ["se.com"],
  "Codian Robotics": ["codian-robotics.com", "abb.com"], Adept: ["omron.com", "industrial.omron.eu"],
  "Elephant Robotics": ["elephantrobotics.com"], Niryo: ["niryo.com"],
  "Productive Robotics": ["productiverobotics.com"], "Standard Bots": ["standardbots.com"],
  Automata: ["automata.tech"], Fruitcore: ["fruitcore-robotics.com"],
  "Annin Robotics": ["anninrobotics.com"], "Agile Robots": ["agile-robots.com"],
  "MABI Robotic": ["mabi-robotic.com"], Robostar: ["robostar.com"],
  Wlkata: ["wlkata.com"], Rozum: ["rozum.com"], IAI: ["iai-robot.com", "intelligentactuator.com"],
  Kawada: ["kawadarobot.co.jp"], Reis: ["kuka.com"],
};

export type DatasheetModel = { id: string; b: string; m: string; n: string };
export type DatasheetCandidate = { url: string; title: string; source: string };

/** Match complete DNS labels; evilabb.com and abb.com.evil.test are not ABB. */
export function isOfficialUrl(url: string, brand: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password && !parsed.port &&
      (OEM_SITES[brand] ?? []).some((domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

/** Require the whole model, not a generic family such as KUKA's 'KR'. */
export function matchesModel(text: string, model: string): boolean {
  const groups = model.toLowerCase().match(/[a-z]+|[0-9]+/g);
  if (!groups?.length) return false;
  // Allow manufacturer punctuation (UR-10e / UR10e), but reject UR10 vs UR10e,
  // IRB 120 vs IRB 1200, and M-20iD/25 vs M-20iD/35.
  const pattern = groups.join("[^a-z0-9]*");
  return new RegExp(`(^|[^a-z0-9])${pattern}($|[^a-z0-9])`, "i").test(text);
}

export function candidateScore(candidate: DatasheetCandidate, item: DatasheetModel): number {
  if (!isOfficialUrl(candidate.url, item.b)) return -1;
  let location = candidate.url;
  try { location = decodeURIComponent(location); } catch { /* Keep malformed percent escapes literal. */ }
  const text = `${location} ${candidate.title}`;
  if (!matchesModel(text, item.m)) return -1;
  // An operating manual is not a product datasheet.
  if (/manual|maintenance|instruction|handbuch|spare.parts/i.test(text)) return -1;
  return /data[-_ ]?sheet|specification|technical[-_ ]data|brochure|leaflet|flyer|product[-_ ]sheet/i.test(text) ? 10 : 5;
}

export function hasPdfSignature(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-";
}

export function isSafePdfLink(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}
