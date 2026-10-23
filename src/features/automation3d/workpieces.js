/**
 * RobotVerse Automation Studio 3D — the real product of each job.
 *
 * A robot cell for tomatoes moves tomatoes, a sack palletizer stacks sacks and a filling cell fills
 * bottles. productFor() reads the user's brief and the line's jobs and names the product; createWorkpieces()
 * builds it at its real size with its own gripper, and the visible stages the line's steps go through
 * (a bottle is filled, then capped, then labelled; a casting loses its riser when it is fettled).
 *
 * Framework-free like robotSim.js: THREE is passed in. productFor() and the tables are plain data, so
 * tests can check every job without a browser.
 */

/* ------------------------------------------------------------------ */
/* Which product                                                       */
/* ------------------------------------------------------------------ */

/** Fruit and vegetables: real size (m), weight and look. */
export const PRODUCE = {
  apple: { label: "Apple", r: 0.038, sy: 0.88, color: "#a51c25", blush: "#c9442c", top: "stem", gloss: 0.6, kg: 0.18 },
  orange: { label: "Orange", r: 0.039, sy: 0.95, color: "#e8730a", blush: "#ef8a1c", top: "navel", gloss: 0.3, rough: 0.6, dots: true, kg: 0.2 },
  mango: { label: "Mango", r: 0.042, sx: 1.32, sy: 0.92, sz: 0.82, color: "#f4b52f", blush: "#e0582a", top: "stem", gloss: 0.4, kg: 0.3 },
  tomato: { label: "Tomato", r: 0.035, sy: 0.8, color: "#d62a1d", blush: "#e8502a", top: "calyx", gloss: 0.9, kg: 0.12 },
  lemon: { label: "Lemon", r: 0.03, sx: 1.32, color: "#f2d21a", blush: "#e7d43a", gloss: 0.35, rough: 0.55, dots: true, kg: 0.1 },
  lime: { label: "Lime", r: 0.026, sx: 1.18, color: "#4f9c2a", blush: "#7cb342", gloss: 0.4, dots: true, kg: 0.07 },
  peach: { label: "Peach", r: 0.036, color: "#f2a65a", blush: "#d6402f", top: "stem", rough: 0.75, sheen: "#ffd9c2", kg: 0.15 },
  pomegranate: { label: "Pomegranate", r: 0.043, color: "#a3182b", blush: "#c9563a", top: "crown", gloss: 0.3, kg: 0.3 },
  pear: { label: "Pear", r: 0.036, shape: "pear", color: "#b9c33c", blush: "#d39b3a", top: "stem", gloss: 0.3, kg: 0.18 },
  kiwi: { label: "Kiwi", r: 0.028, sx: 1.25, color: "#7a5a33", blush: "#6b4f2d", rough: 0.95, sheen: "#a07a4a", kg: 0.08 },
  avocado: { label: "Avocado", r: 0.034, shape: "pear", color: "#2f4a1f", blush: "#3f5a26", rough: 0.85, kg: 0.2 },
  plum: { label: "Plum", r: 0.025, color: "#5a1d4a", blush: "#7b2d5e", top: "stem", gloss: 0.3, kg: 0.06 },
  strawberry: { label: "Strawberry", r: 0.018, shape: "berry", color: "#d0202a", blush: "#e8484a", top: "calyx", gloss: 0.7, dots: "#f5e08a", kg: 0.02 },
  banana: { label: "Banana", shape: "banana", color: "#f1d230", blush: "#b9c23a", gloss: 0.2, kg: 0.15 },
  grapes: { label: "Grape bunch", shape: "bunch", color: "#5b2350", blush: "#7a3366", gloss: 0.5, kg: 0.5 },
  capsicum: { label: "Capsicum", r: 0.04, shape: "pepper", color: "#2e8b2e", blush: "#3f9e35", top: "stem", gloss: 0.9, kg: 0.16 },
  chilli: { label: "Chilli", r: 0.009, len: 0.1, shape: "long", color: "#c81e1e", blush: "#d93a2a", top: "stem", gloss: 0.8, kg: 0.01 },
  cucumber: { label: "Cucumber", r: 0.02, len: 0.2, shape: "long", color: "#2d6a26", blush: "#4f8a3a", gloss: 0.5, dots: "#9ccc65", kg: 0.3 },
  eggplant: { label: "Brinjal", r: 0.03, len: 0.16, shape: "taper", color: "#3b1a46", blush: "#4f2860", top: "calyx", gloss: 0.9, kg: 0.25 },
  potato: { label: "Potato", r: 0.034, sx: 1.3, shape: "lumpy", color: "#b48d58", blush: "#9a7444", rough: 0.95, dots: "#7a5a33", kg: 0.2 },
  onion: { label: "Onion", r: 0.035, shape: "onion", color: "#7a2740", blush: "#a8586a", gloss: 0.3, kg: 0.15 },
  carrot: { label: "Carrot", r: 0.017, len: 0.18, shape: "carrot", color: "#e8761a", blush: "#f0902e", rough: 0.7, kg: 0.08 },
  cabbage: { label: "Cabbage", r: 0.06, shape: "leafy", color: "#8fbf5a", blush: "#c5e09a", rough: 0.6, kg: 1 },
  cauliflower: { label: "Cauliflower", r: 0.058, shape: "floret", color: "#efe7cf", blush: "#e0d4b0", rough: 0.9, kg: 0.8 },
  broccoli: { label: "Broccoli", r: 0.05, shape: "floret", color: "#3d7a2a", blush: "#5b9a3a", rough: 0.9, kg: 0.4 },
  coconut: { label: "Coconut", r: 0.055, color: "#6b4a2a", blush: "#5a3d22", rough: 1, kg: 0.7 },
};

const PRODUCE_WORDS = [
  ["apple", /\bapples?\b/],
  ["orange", /\b(oranges|mandarins?|kinnows?|citrus|tangerines?)\b/],
  ["mango", /\bmango(es|s)?\b/],
  ["tomato", /\btomato(es)?\b/],
  ["lemon", /\blemons?\b/],
  ["lime", /\blimes\b/],
  ["peach", /\b(peach(es)?|apricots?|nectarines?)\b/],
  ["pomegranate", /\bpomegranates?\b/],
  ["pear", /\bpears?\b/],
  ["kiwi", /\bkiwis?\b/],
  ["avocado", /\bavocados?\b/],
  ["plum", /\b(plums?|cherr(y|ies))\b/],
  ["strawberry", /\b(strawberr(y|ies)|berr(y|ies))\b/],
  ["banana", /\bbananas?\b/],
  ["grapes", /\bgrapes?\b/],
  ["chilli", /\bchill?(i|ies|y)\b/],
  ["capsicum", /\b(capsicums?|bell peppers?|peppers?)\b/],
  ["cucumber", /\b(cucumbers?|zucchinis?|courgettes?|gherkins?)\b/],
  ["eggplant", /\b(eggplants?|brinjals?|aubergines?)\b/],
  ["potato", /\bpotato(es)?\b/],
  ["onion", /\bonions?\b/],
  ["carrot", /\bcarrots?\b/],
  ["cabbage", /\b(cabbages?|lettuces?)\b/],
  ["cauliflower", /\bcauliflowers?\b/],
  ["broccoli", /\bbroccoli\b/],
  ["coconut", /\bcoconuts?\b/],
  ["tomato", /\b(vegetables?|veggies)\b/],
];

const BOTTLES = {
  water: { label: "Water bottle (PET)", glass: "#cfe8f5", liquid: "#bfe3ff", cap: "#1d4ed8", band: "#0ea5e9", pet: true },
  juice: { label: "Juice bottle (PET)", glass: "#f3f7fa", liquid: "#f59e0b", cap: "#f97316", band: "#16a34a", pet: true },
  milk: { label: "Milk bottle (HDPE)", opaque: "#f7f7f2", liquid: "#ffffff", cap: "#2563eb", band: "#60a5fa", pet: true },
  oil: { label: "Edible oil bottle", glass: "#f6f3dc", liquid: "#e2b007", cap: "#dc2626", band: "#facc15", pet: true },
  soda: { label: "Soft drink bottle (PET)", glass: "#e5efe9", liquid: "#3b1d14", cap: "#dc2626", band: "#dc2626", pet: true },
  shampoo: { label: "Shampoo bottle (HDPE)", opaque: "#7c3aed", liquid: "#c4b5fd", cap: "#f5f3ff", band: "#f5f3ff", pet: true },
  beer: { label: "Beer bottle (glass)", glass: "#7a4a12", liquid: "#c98a1b", cap: "#d4a017", band: "#f8f1dc", longneck: true },
  wine: { label: "Wine bottle (glass)", glass: "#1f4a2a", liquid: "#5b1020", cap: "#7f1d1d", band: "#f5efe0", longneck: true },
  syrup: { label: "Syrup bottle (amber glass)", glass: "#8a4b12", liquid: "#6b2a0a", cap: "#f5f5f4", band: "#ffffff" },
};
const BOTTLE_WORDS = [
  ["milk", /\bmilk\b(?!ing)/],
  ["juice", /\bjuices?\b/],
  ["oil", /\b(cooking|edible|vegetable|mustard|coconut|sunflower) oil\b/],
  ["soda", /\b(soft drinks?|soda|cola|carbonated)\b/],
  ["shampoo", /\b(shampoo|detergent|lotion|cosmetics?|toiletr\w*|hand ?wash)\b/],
  ["beer", /\bbeer\b/],
  ["wine", /\b(wine|liquor|whisk(e)?y|spirits)\b/],
  ["syrup", /\b(syrups?|medicine bottles?|pharma bottles?)\b/],
  ["water", /\b(water|mineral|drinking)\b/],
];

const SACKS = {
  cement: { label: "Cement bag 50 kg", base: "#c9b48a", print: "#b91c1c", text: "CEMENT", kg: 50, paper: true },
  rice: { label: "Rice bag 25 kg", base: "#f4f1e8", print: "#15803d", text: "BASMATI RICE", kg: 25 },
  flour: { label: "Flour (atta) bag 25 kg", base: "#f6f3ea", print: "#c2410c", text: "WHEAT ATTA", kg: 25 },
  sugar: { label: "Sugar bag 50 kg", base: "#f8f8f5", print: "#1d4ed8", text: "SUGAR", kg: 50 },
  fertiliser: { label: "Fertiliser bag 50 kg", base: "#f5f5f0", print: "#16a34a", text: "UREA 46% N", kg: 50 },
  feed: { label: "Animal feed bag 40 kg", base: "#e9e3cf", print: "#a16207", text: "CATTLE FEED", kg: 40 },
  polymer: { label: "Polymer granules bag 25 kg", base: "#fbfbfb", print: "#334155", text: "PP GRANULES", kg: 25 },
};
const SACK_WORDS = [
  ["cement", /\b(cement|concrete mix|mortar|putty|gypsum|plaster bags?)\b/],
  ["rice", /\b(rice|grain|pulses|dal)\b/],
  ["flour", /\b(flour|atta|maida|wheat)\b/],
  ["sugar", /\b(sugar|salt)\b/],
  ["fertiliser", /\b(fertili[sz]er|urea|dap)\b/],
  ["feed", /\b(feed|fodder)\b/],
  ["polymer", /\b(polymer|granules?|resin|chemicals?|pellets?)\b/],
];

/** Colour words in a brief: "paint the panels red", "black powder coat". */
const COLOURS = [
  [/\bred\b/, "#c81e1e"], [/\bblue\b/, "#1d5fb8"], [/\bgreen\b/, "#1f7a3a"], [/\byellow\b/, "#f2b705"],
  [/\bblack\b/, "#1c1f24"], [/\bwhite\b/, "#eef0f2"], [/\borange\b/, "#ea6a12"], [/\b(grey|gray)\b/, "#9aa3ad"], [/\bsilver\b/, "#c4ccd6"],
];

/**
 * Product words in the user's own brief, most specific first. A brief that names its product wins over the job's
 * typical product (palletizing usually stacks cartons, but "palletize cement bags" stacks sacks).
 */
const BRIEF_PRODUCTS = [
  ["egg", /\beggs?\b/],
  ["cake", /\b(cakes?|cupcakes?|pastr(y|ies)|donuts?|doughnuts?)\b/],
  ["bakery", /\b(bread|buns?|loa(f|ves)|baking trays?|baking pans?|bakery)\b/],
  ["seedling", /\b(seedlings?|saplings?|plant pots?|potted plants?|transplant\w*)\b/],
  ["produce", new RegExp(PRODUCE_WORDS.map(([, re]) => re.source).join("|"))],
  ["meat", /\b(meat|beef|pork|lamb|mutton|chicken|poultry|carcass\w*)\b/],
  ["fish", /\b(fish|salmon|tuna|seafood|prawns?|shrimps?)\b/],
  ["slices", /\b(cheese|salami|ham|sliced)\b/],
  ["cookie", /\b(cookies?|biscuits?|chocolates?|pralines?|cand(y|ies)|sweets|confection\w*)\b/],
  ["mealtray", /\b(ready meals?|meal trays?|food trays?)\b/],
  ["vial", /\b(vials?|ampoules?|ampules?)\b/],
  ["sampletube", /\b(test tubes?|blood tubes?|sample tubes?|blood samples?)\b/],
  ["microplate", /\b(micro ?plates?|well ?plates?|96[- ]well)\b/],
  ["blister", /\b(blisters?|tablet strips?)\b/],
  ["can", /\b(beverage cans?|tin cans?|alumini?um cans?|soda cans?|beer cans?|cans of|canning)\b/],
  ["jar", /\b(jars?|jam|pickles?|honey)\b/],
  ["bottle", /\b(bottles?|bottled|bottling|mineral water|drinking water|juices?|milk bottles?|cooking oil|edible oil|beer|wine|soft drinks?|cola|soda|shampoo|detergent|syrups?)\b/],
  ["pouch", /\b(pouch(es)?|sachets?|chips packets?|snack packs?)\b/],
  ["cup", /\b(plastic cups?|paper cups?|yogh?urt cups?|cups and lids|tubs?)\b/],
  ["sack", /\b(sacks?|bagged|cement bags?|bags? of \w+|(rice|flour|atta|sugar|grain|feed|fertili[sz]er|urea|jute|woven|pp|paper|cement|salt|polymer) bags?)\b/],
  ["bale", /\bbales?\b/],
  ["bobbin", /\b(bobbins?|yarn cones?|cones of yarn|spools?)\b/],
  ["garment", /\b(garments?|shirts?|t-shirts?|clothes|clothing|apparel)\b/],
  ["tyre", /\b(tyres?|tires?)\b/],
  ["windshield", /\b(windshields?|windscreens?)\b/],
  ["glass", /\b(glass (panes?|sheets?|panels?|plates?)|float glass|glazing units?|window glass|mirrors?)\b/],
  ["solar", /\b(solar (panels?|modules?)|pv modules?)\b/],
  ["slab", /\b(granite|marble|stone slabs?|quartz slabs?|slabs?)\b/],
  ["tile", /\btiles?\b/],
  ["brick", /\b(bricks?|concrete blocks?|aac blocks?|fly ?ash)\b/],
  ["coil", /\b(coils?|paper rolls?|film rolls?|jumbo rolls?)\b/],
  ["wafer", /\bwafers?\b/],
  ["pcb", /\b(pcbs?|pcbas?|circuit boards?|electronic boards?)\b/],
  ["module", /\bbattery (modules?|packs?)\b/],
  ["cell", /\b(battery cells?|li-?ion cells?|18650|21700|cylindrical cells?)\b/],
  ["engine", /\b(engine blocks?|engines?|gearbox(es)?|cylinder heads?)\b/],
  ["panel", /\b(mdf|particle ?boards?|plywood|furniture panels?|cabinet doors?|wooden panels?)\b/],
  ["door", /\b(car doors?|doors?|bonnets?|body panels?|car bod(y|ies)|bumpers?)\b/],
  ["faucet", /\b(faucets?|taps?|bath fittings?|sanitary fittings?)\b/],
  ["valve", /\bvalves?\b/],
  ["gear", /\b(gears?|sprockets?)\b/],
  ["shaft", /\b(shafts?|axles?|spindles?)\b/],
  ["casting", /\b(castings?|cast parts?|cast iron|die cast\w*)\b/],
  ["forging", /\b(forgings?|billets?|hot forg\w*)\b/],
  ["shoe", /\b(shoes?|footwear|sneakers?)\b/],
  ["jewellery", /\b(jewel(le)?ry|bangles?|gold rings?|gold)\b/],
  ["gem", /\b(diamonds?|gems?|gemstones?)\b/],
  ["ceramic", /\b(ceramics?|pottery|vases?|mugs?|crockery)\b/],
  ["sheet", /\b(sheet metal|metal sheets?|steel sheets?|sheet blanks?|blanks)\b/],
  ["pipe", /\b(pipes?|tubes?|tubing)\b/],
  ["profile", /\b(extrusions?|alumini?um profiles?)\b/],
  ["parcel", /\b(parcels?|e-?commerce orders?|polybags?|mailers?|courier)\b/],
  ["bracket", /\b(brackets?|frames?|chassis)\b/],
];
/** Container words: what a product goes into more often than the product itself. Only used when nothing else names it. */
const BRIEF_WEAK = [
  ["tote", /\b(totes?|crates?)\b/],
  ["carton", /\b(cartons?|boxes|cases|packages?)\b/],
];

/** The product a job is about, from the job name. [key, job pattern, variant?] — first match wins. */
const JOB_PRODUCTS = [
  ["produce", /fruit|vegetable|harvest/i],
  ["egg", /\begg/i],
  ["bakery", /bakery|bread/i],
  ["cake", /\bicing|topping/i],
  ["meat", /meat|debon/i],
  ["slices", /portion|slic/i],
  ["bowl", /kitchen|food prep/i],
  ["cookie", /food handling|tray loading/i],
  ["mealtray", /tray seal/i],
  ["seedling", /greenhouse|seeding|transplant/i],
  ["teatcup", /milking/i],
  ["plug", /ev charging|charging/i],
  ["vial", /vial|aseptic/i],
  ["blister", /blister|pharma pack/i],
  ["pack", /pharmacy|cartoning/i],
  ["sampletube", /pathology|sample tube/i],
  ["microplate", /pipett/i],
  ["wafer", /wafer|semiconductor/i],
  ["reel", /smt reel|reel & magazine/i],
  ["pcb", /pcb|tht|solder|potting|conformal|gap filler/i],
  ["cell", /battery cell|cell testing/i],
  ["module", /battery module/i],
  ["harness", /wire harness/i],
  ["crimp", /crimp/i],
  ["cabinet", /control cabinet|panel wiring/i],
  ["stator", /stator|hairpin/i],
  ["lamination", /transformer|lamination/i],
  ["glass", /glass handling/i],
  ["windshield", /windshield|windscreen/i],
  ["slab", /stone slab|granite|stone & /i],
  ["tyre", /tyre|tire/i],
  ["coil", /coil|roll handling/i],
  ["bobbin", /bobbin|yarn|cone handling/i],
  ["garment", /garment|textile/i],
  ["bale", /\bbale/i],
  ["waste", /waste|recycl/i],
  ["gem", /diamond|gem/i],
  ["sack", /bag placing|rotary packer/i, "empty"],
  ["sack", /sack|bag opening|bag & /i],
  ["brick", /brick|block stacking/i],
  ["tile", /\btile/i],
  ["ceramic", /glaze/i],
  ["bottle", /bottl/i],
  ["pouch", /pouch|sachet/i],
  ["cup", /denest|\bcup/i],
  ["bundle", /strapping|bundle/i],
  ["parcel", /parcel|^sorting/i],
  ["tote", /crate|tote|asrs|goods-to-person|kitting|order picking|material transport/i],
  ["carton", /truck|container unloading|depalletiz|shipping|dispatch|barcode/i],
  ["solar", /solar/i],
  ["composite", /composite|ply layup|fibre placement|\bndt\b/i],
  ["rebar", /rebar/i],
  ["drywall", /ceiling|drywall/i],
  ["wallpanel", /plaster/i],
  ["shoe", /footwear|sole/i],
  ["jewellery", /jewel/i],
  ["waxtree", /investment shell|wax tree/i],
  ["core", /sand core/i],
  ["forging", /forging/i],
  ["gear", /induction harden|heat treat/i],
  ["profile", /extrusion/i],
  ["probe", /sampling|probing/i],
  ["print3d", /3d printer/i],
  ["mug", /screen & pad|pad print|screen print/i],
  ["blowmould", /blow mould/i],
  ["panel", /furniture panel|edge band|routing|trimming/i],
  ["pipe", /tube & pipe bending|pipe bending/i, "bent"],
  ["pipe", /pipe & orbital|pipe weld|orbital|tig/i, "weld"],
  ["sheet", /press brake/i, "bent"],
  ["sheet", /stamping|press tending/i, "stamped"],
  ["sheet", /sheet loading|nested/i, "nested"],
  ["door", /hemming|painting & coating/i],
  ["enclosure", /powder coat|spray coat/i],
  ["shaft", /thermal spray|cladding|cnc turning|turning/i],
  ["faucet", /^polishing$|plating|dip coat/i],
  ["housing", /masking/i, "mask"],
  ["housing", /adhesive|sealant|dispens/i, "glue"],
  ["housing", /screw/i, "screw"],
  ["plate", /laser cleaning|shot blast/i, "rust"],
  ["plate", /plasma|laser cutting|waterjet/i, "cut"],
  ["plate", /drilling/i, "drill"],
  ["timber", /cutting & sawing|sawing/i],
  ["rubber", /deflash|compression/i],
  ["casting", /grinding|fettling|foundry|ladling|molten|die cast|x-ray/i],
  ["moulded", /ultrasonic/i, "weld"],
  ["moulded", /injection/i],
  ["sheetpair", /laser weld/i, "laser"],
  ["sheetpair", /spot weld/i, "spot"],
  ["sheetpair", /stud weld/i, "stud"],
  ["sheetpair", /friction stir/i, "fsw"],
  ["sheetpair", /rivet/i, "rivet"],
  ["frame", /heavy fabrication|gantry/i],
  ["waam", /wire arc|additive|build-up/i],
  ["bracket", /mig|mag|welding/i],
  ["bearing", /bearing/i],
  ["engine", /heavy lifting|disassembly|reman/i],
  ["woodframe", /nailing|stapling/i],
  ["valve", /leak test/i],
  ["device", /testing & validation|function test/i],
  ["elbow", /bin picking/i],
  ["housing", /^assembly$/i],
  ["block", /cnc|machin|mill|tending|inspection|gauging|measur|marking|cleaning/i],
];
/** Typical products of packing jobs: used only when neither the brief nor another job names the product. */
const JOB_WEAK = [
  ["carton", /palletiz|stacking|packing|box forming|wrapping/i],
  ["bottle", /filling|capping|sealing|labeling/i],
];

const lower = (t) => String(t || "").toLowerCase();
const firstHit = (list, text) => {
  for (const [key, re, variant] of list) if (re.test(text)) return { key, variant };
  return null;
};

/** The variant of a product the brief names: "mangoes" → mango, "rice bags" → rice. */
function variantFor(key, brief, fallback) {
  const words = key === "produce" ? PRODUCE_WORDS : key === "bottle" ? BOTTLE_WORDS : key === "sack" ? SACK_WORDS : null;
  if (words) {
    const hit = words.find(([, re]) => re.test(brief));
    if (hit) return hit[0];
  }
  if (key === "egg") return /\bbrown\b/.test(brief) ? "brown" : "white";
  if (key === "brick") return /\b(concrete|hollow) blocks?\b|\bblocks?\b/.test(brief) ? "block" : /fly ?ash|grey|gray/.test(brief) ? "flyash" : "clay";
  if (key === "bale") return /\bjute\b/.test(brief) ? "jute" : /\b(hay|straw)\b/.test(brief) ? "hay" : /\b(paper|cardboard|waste)\b/.test(brief) ? "paper" : "cotton";
  if (key === "coil") return /\b(paper|film|fabric|textile) rolls?\b|\brolls?\b/.test(brief) ? "roll" : "steel";
  if (key === "slab") return /\bmarble\b/.test(brief) ? "marble" : "granite";
  if (key === "slices") return /\b(ham|salami|meat)\b/.test(brief) ? "ham" : "cheese";
  if (key === "cookie") return /\b(chocolates?|pralines?)\b/.test(brief) ? "praline" : "cookie";
  return fallback || (key === "produce" ? "apple" : key === "bottle" ? "water" : key === "sack" ? "cement" : undefined);
}

/**
 * The product a line handles: { key, variant, coat? }.
 *   brief — the user's own words (may be empty); jobs — the line's job names in order.
 */
export function productFor(brief, jobs = []) {
  const b = lower(brief);
  const names = (Array.isArray(jobs) ? jobs : [jobs]).filter(Boolean).map(String);
  let hit = b ? firstHit(BRIEF_PRODUCTS, b) : null;
  // The first job that is about a product decides, unless the brief named one.
  for (const job of names) {
    if (hit) break;
    hit = firstHit(JOB_PRODUCTS, job);
  }
  if (!hit && b) hit = firstHit(BRIEF_WEAK, b);
  for (const job of names) {
    if (hit) break;
    hit = firstHit(JOB_WEAK, job);
  }
  // A job's own variant (a press brake bends the sheet) stays unless the brief names one.
  if (hit && !hit.variant) {
    const job = names.map((j) => firstHit(JOB_PRODUCTS, j)).find((h) => h && h.key === hit.key && h.variant);
    if (job) hit.variant = job.variant;
  }
  const key = hit ? hit.key : "block";
  const variant = variantFor(key, b, hit && hit.variant);
  const coat = (COLOURS.find(([re]) => re.test(b)) || [])[1];
  return { key, variant, coat };
}

/* ------------------------------------------------------------------ */
/* Product specs                                                       */
/* ------------------------------------------------------------------ */

/**
 * size: [w, h, d] in metres (x, y, z) — the product lying as the robot handles it.
 * grip: the gripper family (eoatKind); look: the gripper's look (soft fingers, vacuum frame…);
 * supply / output: how the product arrives and leaves; kg: weight of one piece.
 */
const SPECS = {
  produce: { grip: "parallel", look: "soft", supply: "crate", output: "crate" },
  egg: { label: (v) => (v === "brown" ? "Brown egg" : "Egg"), size: [0.044, 0.058, 0.044], kg: 0.06, grip: "vacuum", look: "cups", supply: "tray", output: "tray" },
  bakery: { label: "Baking tray of buns", size: [0.4, 0.06, 0.3], kg: 1.2, grip: "fork", supply: "rack", output: "pallet" },
  cake: { label: "Cake", size: [0.18, 0.08, 0.18], kg: 1, grip: "fork", supply: "rack", output: "pallet" },
  meat: { label: "Meat cut with bone", size: [0.22, 0.07, 0.14], kg: 1.5, grip: "parallel", look: "soft", supply: "crate", output: "crate" },
  fish: { label: "Whole fish", size: [0.32, 0.06, 0.1], kg: 0.8, grip: "parallel", look: "soft", supply: "crate", output: "crate" },
  slices: { label: (v) => (v === "ham" ? "Ham slices" : "Cheese slices"), size: [0.14, 0.03, 0.1], kg: 0.15, grip: "vacuum", look: "cups", supply: "crate", output: "tray" },
  bowl: { label: "Bowl of food", size: [0.16, 0.07, 0.16], kg: 0.6, grip: "parallel", supply: "rack", output: "pallet" },
  cookie: { label: (v) => (v === "praline" ? "Chocolate praline" : "Cookie"), size: [0.06, 0.016, 0.06], kg: 0.02, grip: "vacuum", look: "cups", supply: "crate", output: "tray" },
  mealtray: { label: "Ready-meal tray", size: [0.2, 0.05, 0.14], kg: 0.4, grip: "vacuum", supply: "crate", output: "pallet" },
  seedling: { label: "Seedling in pot", size: [0.08, 0.14, 0.08], kg: 0.3, grip: "parallel", look: "soft", supply: "tray", output: "tray" },
  teatcup: { label: "Teat cup cluster", size: [0.16, 0.12, 0.16], kg: 2.5, grip: "parallel", supply: "rack", output: "pallet" },
  plug: { label: "EV charging connector (CCS2)", size: [0.2, 0.08, 0.09], kg: 1.2, grip: "parallel", supply: "rack", output: "pallet" },
  vial: { label: "Glass vial 10 ml", size: [0.024, 0.052, 0.024], kg: 0.02, grip: "parallel", supply: "tray", output: "tray" },
  blister: { label: "Blister pack", size: [0.1, 0.012, 0.055], kg: 0.02, grip: "vacuum", look: "cups", supply: "crate", output: "pallet" },
  pack: { label: "Medicine carton", size: [0.1, 0.04, 0.06], kg: 0.05, grip: "vacuum", look: "cups", supply: "crate", output: "pallet" },
  sampletube: { label: "Blood sample tube", size: [0.016, 0.1, 0.016], kg: 0.01, grip: "parallel", supply: "tray", output: "tray" },
  microplate: { label: "96-well microplate", size: [0.128, 0.015, 0.086], kg: 0.05, grip: "parallel", supply: "rack", output: "pallet" },
  wafer: { label: "Silicon wafer 150 mm", size: [0.15, 0.004, 0.15], kg: 0.03, grip: "vacuum", look: "cups", supply: "rack", output: "pallet" },
  reel: { label: "SMT component reel", size: [0.18, 0.014, 0.18], kg: 0.3, grip: "parallel", supply: "rack", output: "pallet" },
  pcb: { label: "Printed circuit board", size: [0.12, 0.02, 0.09], kg: 0.05, grip: "parallel", supply: "rack", output: "pallet" },
  cell: { label: "21700 battery cell", size: [0.021, 0.07, 0.021], kg: 0.07, grip: "parallel", supply: "tray", output: "tray" },
  module: { label: "Battery module", size: [0.16, 0.08, 0.12], kg: 4, grip: "parallel", supply: "pallet", output: "pallet" },
  harness: { label: "Wire harness", size: [0.2, 0.03, 0.08], kg: 0.3, grip: "parallel", supply: "crate", output: "pallet" },
  crimp: { label: "Wire with crimp terminal", size: [0.12, 0.012, 0.02], kg: 0.01, grip: "parallel", supply: "crate", output: "tray" },
  cabinet: { label: "Control cabinet backplate", size: [0.3, 0.06, 0.22], kg: 6, grip: "vacuum", supply: "pallet", output: "pallet" },
  stator: { label: "Motor stator", size: [0.18, 0.08, 0.18], kg: 8, grip: "parallel", supply: "pallet", output: "pallet" },
  lamination: { label: "Transformer core laminations", size: [0.24, 0.03, 0.2], kg: 9, grip: "magnet", supply: "pallet", output: "pallet" },
  carton: { label: "Corrugated carton", size: [0.3, 0.22, 0.24], kg: 8, grip: "vacuum", supply: "pallet", output: "pallet" },
  bottle: { size: (v) => (BOTTLES[v] && BOTTLES[v].longneck ? [0.062, 0.24, 0.062] : [0.066, 0.21, 0.066]), kg: 0.55, grip: "parallel", supply: "crate", output: "crate" },
  jar: { label: "Glass jar", size: [0.075, 0.1, 0.075], kg: 0.5, grip: "parallel", supply: "crate", output: "crate" },
  can: { label: "Beverage can 330 ml", size: [0.066, 0.122, 0.066], kg: 0.35, grip: "parallel", supply: "crate", output: "crate" },
  tote: { label: "Plastic tote with items", size: [0.4, 0.2, 0.3], kg: 12, grip: "parallel", supply: "pallet", output: "pallet" },
  parcel: { label: "E-commerce parcel", size: [0.25, 0.06, 0.18], kg: 0.8, grip: "vacuum", supply: "crate", output: "pallet" },
  sack: { size: (v) => (v === "empty" ? [0.5, 0.012, 0.32] : [0.5, 0.13, 0.32]), grip: "fork", supply: "pallet", output: "pallet" },
  bale: { label: (v) => `${v === "jute" ? "Jute" : v === "hay" ? "Hay" : v === "paper" ? "Waste paper" : "Cotton"} bale`, size: [0.5, 0.3, 0.32], kg: 170, grip: "fork", supply: "pallet", output: "pallet" },
  bobbin: { label: "Yarn cone", size: [0.14, 0.16, 0.14], kg: 1.8, grip: "parallel", supply: "rack", output: "pallet" },
  garment: { label: "Folded shirt", size: [0.28, 0.035, 0.2], kg: 0.25, grip: "vacuum", look: "cups", supply: "crate", output: "pallet" },
  bundle: { label: "Strapped pipe bundle", size: [0.5, 0.12, 0.13], kg: 30, grip: "fork", supply: "pallet", output: "pallet" },
  tile: { label: "Ceramic floor tile", size: [0.3, 0.01, 0.3], kg: 2.5, grip: "vacuum", supply: "pallet", output: "pallet" },
  waste: { label: "Crushed PET bottle", size: [0.2, 0.06, 0.08], kg: 0.03, grip: "vacuum", look: "cups", supply: "bin", output: "crate" },
  gem: { label: "Diamond", size: [0.02, 0.012, 0.02], kg: 0.001, grip: "vacuum", look: "cups", supply: "tray", output: "tray" },
  glass: { label: "Float glass pane", size: [0.6, 0.008, 0.42], kg: 12, grip: "vacuum", look: "frame", supply: "pallet", output: "pallet" },
  windshield: { label: "Car windshield", size: [0.6, 0.07, 0.38], kg: 14, grip: "vacuum", look: "frame", supply: "pallet", output: "pallet" },
  slab: { label: (v) => (v === "marble" ? "Marble slab" : "Granite slab"), size: [0.6, 0.03, 0.4], kg: 40, grip: "vacuum", look: "frame", supply: "pallet", output: "pallet" },
  tyre: { label: "Car tyre on rim", size: [0.54, 0.19, 0.54], kg: 18, grip: "parallel", half: 0.27, supply: "pallet", output: "pallet" },
  coil: { label: (v) => (v === "roll" ? "Paper roll" : "Steel coil"), size: [0.28, 0.4, 0.4], kg: 250, grip: "fork", supply: "pallet", output: "pallet" },
  brick: {
    label: (v) => (v === "block" ? "Concrete hollow block" : v === "flyash" ? "Fly-ash brick" : "Clay brick"),
    size: (v) => (v === "block" ? [0.4, 0.2, 0.2] : [0.23, 0.075, 0.11]),
    kg: 3, grip: "parallel", supply: "pallet", output: "pallet",
  },
  sheet: { label: (v) => (v === "bent" ? "Sheet blank → bent part" : v === "stamped" ? "Sheet blank → stamped part" : "Steel sheet blank"), size: [0.5, 0.06, 0.35], kg: 4, grip: "vacuum", supply: "pallet", output: "pallet" },
  panel: { label: "Furniture panel", size: [0.6, 0.018, 0.4], kg: 8, grip: "vacuum", look: "frame", supply: "pallet", output: "pallet" },
  pipe: { label: (v) => (v === "bent" ? "Steel tube → bent" : v === "weld" ? "Pipe joint" : "Steel pipe"), size: (v) => (v === "bent" ? [0.45, 0.07, 0.22] : [0.45, 0.07, 0.07]), kg: 3, grip: "parallel", half: 0.035, supply: "pallet", output: "pallet" },
  profile: { label: "Aluminium extrusion", size: [0.45, 0.04, 0.04], kg: 0.7, grip: "parallel", supply: "pallet", output: "pallet" },
  casting: { label: "Aluminium casting", size: [0.16, 0.12, 0.12], kg: 2.5, grip: "parallel", supply: "bin", output: "pallet" },
  core: { label: "Sand core", size: [0.2, 0.08, 0.12], kg: 3, grip: "parallel", supply: "rack", output: "pallet" },
  forging: { label: "Hot forging billet", size: [0.13, 0.12, 0.13], kg: 3, grip: "parallel", half: 0.035, supply: "bin", output: "pallet" },
  moulded: { label: "Moulded plastic housing", size: [0.12, 0.05, 0.08], kg: 0.15, grip: "parallel", supply: "crate", output: "crate" },
  blowmould: { label: "HDPE jerrycan", size: [0.13, 0.22, 0.08], kg: 0.3, grip: "parallel", supply: "crate", output: "pallet" },
  rubber: { label: "Moulded rubber seal", size: [0.12, 0.022, 0.12], kg: 0.1, grip: "parallel", supply: "crate", output: "crate" },
  shaft: { label: "Turned steel shaft", size: [0.22, 0.05, 0.05], kg: 2, grip: "parallel", supply: "pallet", output: "pallet" },
  block: { label: "Machined part", size: [0.12, 0.07, 0.1], kg: 1.5, grip: "parallel", supply: "bin", output: "pallet" },
  bracket: { label: "Welded steel bracket", size: [0.14, 0.08, 0.1], kg: 1.8, grip: "parallel", supply: "bin", output: "pallet" },
  frame: { label: "Fabricated beam", size: [0.45, 0.12, 0.14], kg: 25, grip: "magnet", supply: "pallet", output: "pallet" },
  waam: { label: "WAAM build on base plate", size: [0.2, 0.11, 0.1], kg: 4, grip: "parallel", supply: "pallet", output: "pallet" },
  sheetpair: { label: (v) => ({ spot: "Car body sub-assembly", laser: "Laser-welded sheets", fsw: "Aluminium plates (FSW)", rivet: "Riveted sheet joint", stud: "Panel with weld studs" })[v] || "Sheet joint", size: [0.3, 0.02, 0.2], kg: 2, grip: "vacuum", supply: "pallet", output: "pallet" },
  gear: { label: "Spur gear", size: [0.14, 0.03, 0.14], kg: 1.5, grip: "parallel", supply: "bin", output: "pallet" },
  bearing: { label: "Bearing housing", size: [0.14, 0.07, 0.1], kg: 2, grip: "parallel", supply: "bin", output: "pallet" },
  engine: { label: "Engine block", size: [0.36, 0.26, 0.26], kg: 90, grip: "parallel", supply: "pallet", output: "pallet" },
  door: { label: "Car door outer panel", size: [0.6, 0.03, 0.42], kg: 9, grip: "vacuum", look: "frame", supply: "pallet", output: "pallet" },
  enclosure: { label: "Sheet-metal enclosure", size: [0.2, 0.22, 0.12], kg: 5, grip: "parallel", supply: "pallet", output: "pallet" },
  housing: { label: "Cast gearbox housing", size: [0.16, 0.08, 0.12], kg: 2, grip: "parallel", supply: "bin", output: "pallet" },
  solar: { label: "Solar PV module", size: [0.6, 0.035, 0.36], kg: 20, grip: "vacuum", look: "frame", supply: "pallet", output: "pallet" },
  composite: { label: "Carbon-fibre ply stack", size: [0.5, 0.012, 0.35], kg: 1.5, grip: "vacuum", look: "frame", supply: "pallet", output: "pallet" },
  rebar: { label: "Rebar mesh", size: [0.45, 0.04, 0.35], kg: 12, grip: "magnet", supply: "pallet", output: "pallet" },
  drywall: { label: "Gypsum ceiling board", size: [0.6, 0.0125, 0.4], kg: 9, grip: "vacuum", look: "frame", supply: "pallet", output: "pallet" },
  wallpanel: { label: "Brick wall panel", size: [0.5, 0.07, 0.35], kg: 30, grip: "vacuum", look: "frame", supply: "pallet", output: "pallet" },
  shoe: { label: "Shoe upper on last", size: [0.28, 0.1, 0.1], kg: 0.6, grip: "parallel", supply: "rack", output: "pallet" },
  jewellery: { label: "Gold bangle", size: [0.07, 0.012, 0.07], kg: 0.03, grip: "parallel", supply: "tray", output: "tray" },
  ceramic: { label: "Ceramic vase", size: [0.1, 0.16, 0.1], kg: 0.8, grip: "parallel", supply: "rack", output: "pallet" },
  faucet: { label: "Brass faucet body", size: [0.16, 0.13, 0.06], kg: 1.2, grip: "parallel", half: 0.022, supply: "bin", output: "pallet" },
  mug: { label: "Printed mug", size: [0.11, 0.095, 0.085], kg: 0.35, grip: "parallel", supply: "crate", output: "crate" },
  waxtree: { label: "Wax tree (investment casting)", size: [0.12, 0.24, 0.12], kg: 3, grip: "parallel", half: 0.012, supply: "rack", output: "pallet" },
  probe: { label: "Sampling probe cartridge", size: [0.35, 0.03, 0.03], kg: 0.6, grip: "parallel", supply: "rack", output: "pallet" },
  print3d: { label: "3D-printed part on build plate", size: [0.2, 0.09, 0.2], kg: 0.6, grip: "parallel", supply: "rack", output: "pallet" },
  plate: { label: (v) => (v === "rust" ? "Rusty steel plate" : v === "cut" ? "Steel plate for cutting" : "Aluminium skin panel"), size: [0.3, 0.02, 0.22], kg: 10, grip: "magnet", supply: "pallet", output: "pallet" },
  timber: { label: "Timber plank", size: [0.45, 0.05, 0.1], kg: 2, grip: "parallel", supply: "pallet", output: "pallet" },
  elbow: { label: "Pipe elbow", size: [0.11, 0.045, 0.11], kg: 0.6, grip: "parallel", supply: "bin", output: "pallet" },
  woodframe: { label: "Wooden pallet frame", size: [0.35, 0.07, 0.25], kg: 6, grip: "parallel", supply: "pallet", output: "pallet" },
  valve: { label: "Brass ball valve", size: [0.12, 0.08, 0.06], kg: 0.9, grip: "parallel", supply: "bin", output: "pallet" },
  device: { label: "Electronic device", size: [0.075, 0.01, 0.155], kg: 0.2, grip: "vacuum", look: "cups", supply: "crate", output: "tray" },
  pouch: { label: "Snack pouch", size: [0.13, 0.03, 0.18], kg: 0.1, grip: "vacuum", look: "cups", supply: "crate", output: "pallet" },
  cup: { label: "Plastic cup", size: [0.075, 0.09, 0.075], kg: 0.01, grip: "vacuum", look: "cups", supply: "crate", output: "tray" },
};

const variantLabel = (key, v) =>
  key === "produce" ? (PRODUCE[v] || PRODUCE.apple).label
    : key === "bottle" ? (BOTTLES[v] || BOTTLES.water).label
      : key === "sack" ? (v === "empty" ? "Empty valve bag" : (SACKS[v] || SACKS.cement).label)
        : null;

/** Plain facts about a picked product: { label, size:[w,h,d], kg, grip, look }. */
export function productInfo(pick) {
  const key = SPECS[pick && pick.key] ? pick.key : "block";
  const v = pick && pick.variant;
  const s = SPECS[key];
  const val = (x) => (typeof x === "function" ? x(v) : x);
  const p = key === "produce" ? PRODUCE[v] || PRODUCE.apple : null;
  const size = p ? produceSize(p) : val(s.size);
  const kg = p ? p.kg : key === "sack" ? (v === "empty" ? 0.15 : (SACKS[v] || SACKS.cement).kg) : val(s.kg);
  return { key, variant: v, label: variantLabel(key, v) || val(s.label) || key, size, kg, grip: s.grip, look: s.look || s.grip, half: s.half, supply: s.supply, output: s.output };
}

function produceSize(p) {
  const r = p.r || 0.04;
  switch (p.shape) {
    case "long": return [p.len, r * 2, r * 2];
    case "taper": return [p.len, r * 2, r * 2];
    case "carrot": return [p.len + 0.06, r * 2, r * 2];
    case "banana": return [0.19, 0.045, 0.04];
    case "bunch": return [0.11, 0.14, 0.09];
    case "berry": return [r * 2, r * 2.6, r * 2];
    case "pear": return [r * 2, r * 2.7, r * 2];
    case "onion": return [r * 2, r * 2.3, r * 2];
    default: return [r * 2 * (p.sx || 1), r * 2 * (p.sy || 1) + (p.top === "stem" ? 0.012 : 0), r * 2 * (p.sz || 1)];
  }
}

/** Every product key, for tests and the job checks. */
export const PRODUCT_KEYS = Object.keys(SPECS);

/* ------------------------------------------------------------------ */
/* Building the product in 3D                                          */
/* ------------------------------------------------------------------ */

/** Small, repeatable random numbers so a product looks the same every time. */
function rng(seed = 7) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * createWorkpieces(THREE, pick) — the product kit for one line.
 *   spawn()               a new piece (stages the line still has to do are hidden)
 *   setState(part, s)     "raw" | "machined" | "coated" | "polished"
 *   reveal(part, stage)   show what a step adds (fill, cap, label, weld, assemble…); false if the product has nothing for it
 *   container(kind, n)    crate / tray / rack / bin holding product, for supply and output
 *   info                  label, size, kg, grip family and look
 *   dispose()
 * opts.stages: the stages the line performs (their results start hidden).
 */
export function createWorkpieces(THREE, pick, opts = {}) {
  const info = productInfo(pick);
  const key = info.key;
  const v = info.variant;
  const [W, H, D] = info.size;
  const stages = new Set(opts.stages || []);
  const coat = pick && pick.coat;

  const geos = [];
  const mats = new Map();
  const texs = [];
  const physical = THREE.MeshPhysicalMaterial || THREE.MeshStandardMaterial;
  const g = (geo) => {
    geos.push(geo);
    return geo;
  };
  /** One material per id, with flags for how it changes: metal, paint, stone, glass, organic, keep. */
  function mat(id, o = {}, flags = {}) {
    if (mats.has(id)) return mats.get(id);
    const phys = o.clearcoat || o.sheen || o.iridescence || o.transmission;
    const m = new (phys ? physical : THREE.MeshStandardMaterial)({ roughness: 0.5, metalness: 0, ...o });
    m.userData = { id, ...flags };
    mats.set(id, m);
    return m;
  }
  function tex(w, h, draw, { repeat, srgb = true } = {}) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb && THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat[0], repeat[1]);
    }
    t.anisotropy = 4;
    texs.push(t);
    return t;
  }

  const root = new THREE.Group();
  root.name = "workpiece";
  const body = new THREE.Group();
  body.position.y = -H / 2;
  root.add(body);

  const _e = new THREE.Euler();
  const _q = new THREE.Quaternion();
  const _m = new THREE.Matrix4();
  const V3 = (a, d = 0) => new THREE.Vector3(a ? a[0] : d, a ? a[1] : d, a ? a[2] : d);
  /** A mesh in the product: p position, r rotation, s scale. */
  function mesh(geo, m, p, r, s, parent = body) {
    const o = new THREE.Mesh(g(geo), m);
    if (p) o.position.set(p[0], p[1], p[2]);
    if (r) o.rotation.set(r[0], r[1], r[2]);
    if (s) o.scale.set(s[0], s[1], s[2]);
    o.castShadow = true;
    o.receiveShadow = true;
    o.userData.mat = m.userData.id;
    parent.add(o);
    return o;
  }
  /** Appears when the line does `stage` (a cap when capping…). */
  const show = (o, stage) => ((o.userData.showOn = stage), o);
  /** Goes away when the line does `stage` (a riser when fettling…). */
  const hide = (o, stage) => ((o.userData.hideOn = stage), o);
  /** Many pieces of one material as one mesh (fewer draw calls). parts: [geometry, {p, r, s}] */
  function merge(parts) {
    const pos = [], nor = [], uv = [];
    for (const [geo, t = {}] of parts) {
      const gg = geo.index ? geo.toNonIndexed() : geo.clone();
      _m.compose(V3(t.p), _q.setFromEuler(_e.set(...(t.r || [0, 0, 0]))), V3(t.s, 1));
      gg.applyMatrix4(_m);
      pos.push(gg.attributes.position.array);
      nor.push(gg.attributes.normal.array);
      uv.push(gg.attributes.uv ? gg.attributes.uv.array : new Float32Array(gg.attributes.position.count * 2));
      gg.dispose();
    }
    for (const [geo] of parts) geo.dispose();
    const cat = (arrs) => {
      const out = new Float32Array(arrs.reduce((n, a) => n + a.length, 0));
      let o = 0;
      for (const a of arrs) {
        out.set(a, o);
        o += a.length;
      }
      return out;
    };
    const out = new THREE.BufferGeometry();
    out.setAttribute("position", new THREE.BufferAttribute(cat(pos), 3));
    out.setAttribute("normal", new THREE.BufferAttribute(cat(nor), 3));
    out.setAttribute("uv", new THREE.BufferAttribute(cat(uv), 2));
    return out;
  }
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (rt, rb, h, seg = 24, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
  const sphere = (r, ws = 24, hs = 16) => new THREE.SphereGeometry(r, ws, hs);
  const lathe = (pts, seg = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), seg);
  function rrect(w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    r = Math.min(r, w / 2 - 1e-5, h / 2 - 1e-5);
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  /** A shape (in x/z, seen from above) extruded upwards by h, with soft edges; UVs spread over the top. */
  function slab(shape, w, d, h, bevel = 0) {
    const b = Math.min(bevel, h / 2 - 1e-5);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: Math.max(1e-5, h - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b * 0.8, bevelSegments: 3, curveSegments: 10 });
    geo.translate(0, 0, b);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position, uvA = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) uvA.setXY(i, (p.getX(i) + w / 2) / w, (-p.getZ(i) + d / 2) / d);
    return geo;
  }
  /** A rounded block w × h × d standing on y = 0. */
  const rblock = (w, h, d, r) => slab(rrect(w - 1.6 * r, d - 1.6 * r, r), w, d, h, r);

  /* Procedural surfaces */
  const R = rng(key.length * 97 + (v ? v.length : 0));
  const skinTex = (c1, c2, dots) =>
    tex(128, 64, (x, w, h) => {
      const gr = x.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, c2);
      gr.addColorStop(0.55, c1);
      gr.addColorStop(1, c1);
      x.fillStyle = gr;
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 14; i++) {
        x.fillStyle = c2 + "55";
        x.beginPath();
        x.ellipse(R() * w, R() * h * 0.8, 6 + R() * 14, 4 + R() * 8, 0, 0, Math.PI * 2);
        x.fill();
      }
      if (dots) {
        x.fillStyle = typeof dots === "string" ? dots : "rgba(255,255,255,0.18)";
        for (let i = 0; i < 160; i++) x.fillRect(R() * w, R() * h, 1, 1);
      }
    });
  const noiseTex = (base, spots, n = 900, size = 2, repeat) =>
    tex(128, 128, (x, w, h) => {
      x.fillStyle = base;
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < n; i++) {
        x.fillStyle = spots[Math.floor(R() * spots.length)];
        const s = size * (0.5 + R());
        x.fillRect(R() * w, R() * h, s, s);
      }
    }, { repeat });
  /** A printed band with big text: sacks, labels, cartons. */
  const printTex = (base, ink, text, sub, w = 256, h = 160) =>
    tex(w, h, (x) => {
      x.fillStyle = base;
      x.fillRect(0, 0, w, h);
      x.fillStyle = ink;
      x.fillRect(0, h * 0.18, w, h * 0.12);
      x.fillRect(0, h * 0.72, w, h * 0.06);
      x.font = `800 ${Math.round(h * 0.2)}px Inter, Arial, sans-serif`;
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.fillText(text, w / 2, h * 0.5);
      if (sub) {
        x.font = `600 ${Math.round(h * 0.09)}px Inter, Arial, sans-serif`;
        x.fillText(sub, w / 2, h * 0.88);
      }
    });
  const labelTex = (band, text) =>
    tex(256, 64, (x, w, h) => {
      x.fillStyle = "#fbfbf8";
      x.fillRect(0, 0, w, h);
      x.fillStyle = band;
      x.fillRect(0, 0, w, h * 0.3);
      x.fillRect(0, h * 0.82, w, h * 0.18);
      x.fillStyle = "#1f2937";
      x.font = "700 22px Inter, Arial, sans-serif";
      x.textBaseline = "middle";
      for (let i = 0; i < 2; i++) x.fillText(text, 10 + i * 128, h * 0.56);
    });
  const barcodeTex = () =>
    tex(128, 96, (x, w, h) => {
      x.fillStyle = "#ffffff";
      x.fillRect(0, 0, w, h);
      x.fillStyle = "#111827";
      x.fillRect(8, 8, 70, 6);
      x.fillRect(8, 20, 50, 4);
      for (let i = 0, px = 10; px < w - 10; i++) {
        const bw = 1 + Math.floor(R() * 3);
        if (i % 2 === 0) x.fillRect(px, 40, bw, 40);
        px += bw + 1;
      }
    });

  /* Shared materials */
  const steel = () => mat("steel", { color: 0x9aa4ae, metalness: 0.75, roughness: 0.38 }, { metal: true, paint: true });
  const brightSteel = () => mat("bright", { color: 0xd7dee6, metalness: 0.9, roughness: 0.22 }, { metal: true, paint: true });
  const alu = () => mat("alu", { color: 0xc9d0d8, metalness: 0.85, roughness: 0.3 }, { metal: true, paint: true });
  const castAlu = () => mat("castalu", { color: 0xa9afb5, metalness: 0.55, roughness: 0.75, map: noiseTex("#a9afb5", ["#9aa0a6", "#b8bec4"], 1400, 1.5) }, { metal: true, paint: true });
  const blackRubber = () => mat("rubber", { color: 0x1b1d20, roughness: 0.92 });
  const blackPlastic = () => mat("bplastic", { color: 0x1f2328, roughness: 0.55 });
  const whitePlastic = () => mat("wplastic", { color: 0xf1f2f0, roughness: 0.45 });
  const glassMat = (color = 0xdfeef0, opacity = 0.3) => mat("glass" + color, { color, roughness: 0.04, metalness: 0.1, transparent: true, opacity, depthWrite: false, envMapIntensity: 1.6 }, { glass: true });
  const weldBead = () => mat("bead", { color: 0x5a4a3a, metalness: 0.6, roughness: 0.5 });
  const copper = () => mat("copper", { color: 0xc8743a, metalness: 0.9, roughness: 0.3 }, { metal: true, keep: true });
  const wood = (c = "#c79a62") =>
    mat("wood" + c, {
      map: tex(128, 128, (x, w, h) => {
        x.fillStyle = c;
        x.fillRect(0, 0, w, h);
        for (let i = 0; i < 40; i++) {
          x.strokeStyle = `rgba(90,55,25,${0.08 + R() * 0.15})`;
          x.lineWidth = 1 + R() * 2;
          x.beginPath();
          const y = R() * h;
          x.moveTo(0, y);
          x.bezierCurveTo(w * 0.3, y + R() * 6 - 3, w * 0.7, y + R() * 6 - 3, w, y + R() * 4 - 2);
          x.stroke();
        }
      }),
      roughness: 0.8,
    }, { paint: true });

  /* ---------------- builders ---------------- */
  const B = {
    produce() {
      const p = PRODUCE[v] || PRODUCE.apple;
      const r = p.r || 0.04;
      const skin = mat("skin", {
        map: skinTex(p.color, p.blush || p.color, p.dots),
        roughness: p.rough ?? 0.45,
        clearcoat: p.gloss || 0,
        clearcoatRoughness: 0.3,
        ...(p.sheen ? { sheen: 1, sheenColor: new THREE.Color(p.sheen), sheenRoughness: 0.6 } : {}),
      }, { organic: true });
      const stemM = mat("stem", { color: 0x5b4228, roughness: 0.9 }, { organic: true });
      const leafM = mat("leaf", { color: 0x3f7d2a, roughness: 0.6, side: THREE.DoubleSide }, { organic: true });
      const sx = p.sx || 1, sy = p.sy || 1, sz = p.sz || 1;
      let top = 2 * r * sy;
      switch (p.shape) {
        case "pear":
          mesh(lathe([[0, 0], [r * 0.6, r * 0.08], [r * 0.95, r * 0.5], [r, r * 0.95], [r * 0.82, r * 1.45], [r * 0.52, r * 1.95], [r * 0.4, r * 2.3], [r * 0.18, r * 2.6], [0, r * 2.65]], 28), skin);
          top = r * 2.65;
          break;
        case "berry":
          mesh(lathe([[0, 0], [r * 0.45, r * 0.25], [r * 0.85, r * 1.0], [r, r * 1.7], [r * 0.8, r * 2.3], [0, r * 2.45]], 20), skin);
          top = r * 2.45;
          break;
        case "onion":
          mesh(lathe([[0, 0], [r * 0.3, r * 0.06], [r * 0.85, r * 0.45], [r, r * 1.0], [r * 0.8, r * 1.6], [r * 0.3, r * 2.0], [r * 0.08, r * 2.3], [0, r * 2.32]], 26), skin);
          top = r * 2.3;
          break;
        case "long": {
          const len = p.len;
          mesh(new THREE.CapsuleGeometry(r, len - 2 * r, 6, 16), skin, [0, r, 0], [0, 0, Math.PI / 2]);
          top = 2 * r;
          if (p.top === "stem") mesh(cyl(r * 0.25, r * 0.35, 0.014, 8), mat("stemg", { color: 0x4d7a2a, roughness: 0.7 }, { organic: true }), [len / 2 + 0.004, r, 0], [0, 0, Math.PI / 2]);
          return;
        }
        case "taper": {
          const len = p.len;
          const geo = lathe([[0, 0], [r * 0.7, len * 0.05], [r, len * 0.25], [r * 0.95, len * 0.55], [r * 0.62, len * 0.85], [r * 0.4, len * 0.97], [0, len]], 24);
          mesh(geo, skin, [-len / 2, r, 0], [0, 0, -Math.PI / 2]);
          const calyx = merge(Array.from({ length: 5 }, (_, i) => [box(0.026, 0.002, 0.009), { p: [len / 2 - 0.008, r + Math.sin((i / 5) * Math.PI * 2) * r * 0.45, Math.cos((i / 5) * Math.PI * 2) * r * 0.45], r: [(i / 5) * Math.PI * 2, 0, 0.3] }]));
          mesh(calyx, leafM);
          mesh(cyl(r * 0.22, r * 0.25, 0.03, 8), mat("stemg", { color: 0x4d7a2a, roughness: 0.7 }, { organic: true }), [len / 2 + 0.012, r, 0], [0, 0, Math.PI / 2]);
          return;
        }
        case "carrot": {
          const len = p.len;
          mesh(lathe([[0, 0], [r * 0.25, len * 0.1], [r * 0.6, len * 0.45], [r * 0.9, len * 0.85], [r, len * 0.97], [0, len]], 18), skin, [len / 2 - 0.03, r, 0], [0, 0, Math.PI / 2]);
          const tops = merge(Array.from({ length: 5 }, (_, i) => [cyl(0.0015, 0.003, 0.07, 5), { p: [-len / 2 - 0.02, r + (i - 2) * 0.004, (i - 2) * 0.005], r: [0, 0, Math.PI / 2 + (i - 2) * 0.12] }]));
          mesh(tops, mat("leafthin", { color: 0x4f8f2a, roughness: 0.6 }, { organic: true }));
          return;
        }
        case "banana": {
          const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.09, 0.03, 0), new THREE.Vector3(0, -0.006, 0), new THREE.Vector3(0.09, 0.03, 0));
          mesh(new THREE.TubeGeometry(curve, 24, 0.017, 10, false), skin, [0, 0.0175, 0]);
          const tipM = mat("bantip", { color: 0x3b2a1a, roughness: 0.9 }, { organic: true });
          mesh(cyl(0.006, 0.01, 0.02, 8), tipM, [0.095, 0.0375, 0], [0, 0, -0.9]);
          mesh(sphere(0.008, 8, 6), tipM, [-0.09, 0.0475, 0]);
          return;
        }
        case "bunch": {
          const berries = [];
          const rr = 0.0105;
          for (let layer = 0; layer < 6; layer++) {
            const n = Math.max(1, 6 - layer);
            const ring = 0.012 + (5 - layer) * 0.006;
            for (let i = 0; i < n; i++) {
              const a = (i / n) * Math.PI * 2 + layer;
              berries.push([sphere(rr, 12, 8), { p: [Math.cos(a) * ring, 0.012 + (5 - layer) * 0.02, Math.sin(a) * ring * 0.8] }]);
            }
          }
          mesh(merge(berries), skin);
          mesh(cyl(0.002, 0.003, 0.03, 6), stemM, [0, 0.13, 0]);
          return;
        }
        case "pepper": {
          const geo = sphere(r, 32, 20);
          const pa = geo.attributes.position;
          for (let i = 0; i < pa.count; i++) {
            const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
            const lobe = 1 + 0.09 * Math.cos(4 * Math.atan2(z, x));
            const flat = y < -r * 0.6 ? 0.85 : 1;
            pa.setXYZ(i, x * lobe, y * 0.95 * flat, z * lobe);
          }
          geo.computeVertexNormals();
          mesh(geo, skin, [0, r * 0.95, 0]);
          mesh(cyl(0.004, 0.006, 0.02, 8), mat("stemg", { color: 0x4d7a2a, roughness: 0.7 }, { organic: true }), [0, r * 1.95 + 0.006, 0]);
          return;
        }
        case "lumpy": {
          const geo = sphere(r, 24, 16);
          const pa = geo.attributes.position;
          for (let i = 0; i < pa.count; i++) {
            const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
            const k = 1 + 0.07 * Math.sin(x * 140) * Math.cos(z * 120) + 0.05 * Math.sin(y * 170);
            pa.setXYZ(i, x * k * sx, y * k * 0.78, z * k);
          }
          geo.computeVertexNormals();
          mesh(geo, skin, [0, r * 0.78, 0]);
          return;
        }
        case "leafy": {
          mesh(sphere(r * 0.86, 24, 16), skin, [0, r * 0.9, 0], null, [1, 0.92, 1]);
          const outer = mat("leafOuter", { color: 0x5f9a3a, roughness: 0.6, side: THREE.DoubleSide }, { organic: true });
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2;
            mesh(new THREE.SphereGeometry(r, 16, 10, 0, Math.PI * 0.9, Math.PI * 0.35, Math.PI * 0.55), outer, [0, r * 0.9, 0], [0, a, 0]);
          }
          return;
        }
        case "floret": {
          const buds = [];
          for (let i = 0; i < 22; i++) {
            const a = i * 2.4, rad = Math.sqrt(i / 22) * r * 0.85;
            buds.push([sphere(r * 0.3, 10, 8), { p: [Math.cos(a) * rad, r * 0.75 + Math.cos((rad / r) * 1.4) * r * 0.45, Math.sin(a) * rad] }]);
          }
          mesh(merge(buds), skin);
          const leaf = mat("cleaf", { color: 0x4a7f30, roughness: 0.6, side: THREE.DoubleSide }, { organic: true });
          for (let i = 0; i < 5; i++) mesh(new THREE.SphereGeometry(r * 0.9, 12, 8, 0, Math.PI * 0.5, Math.PI * 0.45, Math.PI * 0.4), leaf, [0, r * 0.65, 0], [0, (i / 5) * Math.PI * 2, 0]);
          return;
        }
        default:
          mesh(sphere(r, 32, 20), skin, [0, r * sy, 0], null, [sx, sy, sz]);
      }
      if (p.top === "stem") {
        mesh(cyl(0.0022, 0.003, 0.016, 6), stemM, [0.002, top + 0.004, 0], [0, 0, 0.25]);
        if (v === "apple" || v === "pear" || v === "mango") mesh(sphere(0.011, 10, 6), leafM, [0.012, top + 0.006, 0], [0, 0, -0.3], [1, 0.16, 0.48]);
      } else if (p.top === "calyx") {
        const n = 5;
        mesh(merge(Array.from({ length: n }, (_, i) => [box(0.016, 0.0018, 0.005), { p: [Math.cos((i / n) * Math.PI * 2) * 0.007, top - 0.001, Math.sin((i / n) * Math.PI * 2) * 0.007], r: [0, -(i / n) * Math.PI * 2, 0.15] }])), leafM);
        mesh(cyl(0.0018, 0.0024, 0.01, 6), mat("stemg", { color: 0x4d7a2a, roughness: 0.7 }, { organic: true }), [0, top + 0.004, 0]);
      } else if (p.top === "crown") {
        mesh(cyl(0.008, 0.011, 0.014, 7, true), mat("crown", { color: 0x7a2a22, roughness: 0.8, side: THREE.DoubleSide }, { organic: true }), [0, top + 0.004, 0]);
      } else if (p.top === "navel") {
        mesh(cyl(0.004, 0.004, 0.002, 8), mat("navel", { color: 0xc96a10, roughness: 0.9 }, { organic: true }), [0, top - 0.0005, 0]);
      }
    },

    egg() {
      const shell = mat("shell", { color: v === "brown" ? 0xc98b5a : 0xf2ede2, roughness: 0.55, map: noiseTex(v === "brown" ? "#c98b5a" : "#f2ede2", ["#00000010", "#ffffff22"], 500, 1.5) }, { organic: true });
      const pts = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        const y = t * H;
        const u = 2 * t - 1;
        pts.push([Math.sqrt(Math.max(0, 1 - u * u)) * (W / 2) * (1 - 0.14 * u), y]);
      }
      mesh(lathe(pts, 28), shell);
    },

    bakery() {
      const pan = mat("pan", { color: 0xb8bfc6, metalness: 0.8, roughness: 0.35 }, { metal: true });
      mesh(box(W, 0.004, D), pan, [0, 0.002, 0]);
      mesh(merge([[box(W, 0.016, 0.004), { p: [0, 0.01, D / 2] }], [box(W, 0.016, 0.004), { p: [0, 0.01, -D / 2] }], [box(0.004, 0.016, D), { p: [W / 2, 0.01, 0] }], [box(0.004, 0.016, D), { p: [-W / 2, 0.01, 0] }]]), pan);
      const bun = mat("bun", { map: skinTex("#c98a3a", "#8a4a16"), roughness: 0.6, clearcoat: 0.25 }, { organic: true });
      const buns = [];
      for (const x of [-0.13, 0, 0.13]) for (const z of [-0.07, 0.07]) buns.push([sphere(0.05, 18, 12), { p: [x, 0.006, z], s: [1, 0.8, 1] }]);
      mesh(merge(buns.map(([geo, t]) => [new THREE.SphereGeometry(0.05, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), t])), bun);
      buns.forEach(([geo]) => geo.dispose());
    },

    cake() {
      mesh(cyl(0.09, 0.09, 0.004, 40), mat("board", { color: 0xd8dde3, metalness: 0.8, roughness: 0.3 }), [0, 0.002, 0]);
      mesh(cyl(0.078, 0.078, 0.05, 40), mat("sponge", { map: noiseTex("#e3b56a", ["#d39f52", "#efc985"], 1200, 2), roughness: 0.9 }, { organic: true }), [0, 0.029, 0]);
      const icing = mat("icing", { color: 0xfbf3ea, roughness: 0.35, clearcoat: 0.4 }, { organic: true });
      show(mesh(cyl(0.081, 0.081, 0.012, 40), icing, [0, 0.059, 0]), "apply");
      show(mesh(new THREE.TorusGeometry(0.079, 0.006, 8, 40), icing, [0, 0.054, 0], [Math.PI / 2, 0, 0]), "apply");
      const cherries = merge(Array.from({ length: 6 }, (_, i) => [sphere(0.008, 10, 8), { p: [Math.cos(i) * 0.05, 0.072, Math.sin(i) * 0.05] }]));
      show(mesh(cherries, mat("cherry", { color: 0xb3122a, roughness: 0.2, clearcoat: 1 }, { organic: true })), "apply");
    },

    meat() {
      const meatM = mat("meat", { map: noiseTex("#a8323a", ["#c94a52", "#8a2229", "#e7b9b4"], 900, 2.5), roughness: 0.5, clearcoat: 0.3 }, { organic: true });
      const fat = mat("fat", { color: 0xf1ddd0, roughness: 0.6 }, { organic: true });
      const s = new THREE.Shape();
      s.moveTo(-0.1, -0.05);
      s.bezierCurveTo(-0.04, -0.075, 0.06, -0.065, 0.1, -0.03);
      s.bezierCurveTo(0.115, 0.01, 0.09, 0.06, 0.03, 0.065);
      s.bezierCurveTo(-0.04, 0.07, -0.1, 0.05, -0.11, 0.0);
      s.bezierCurveTo(-0.115, -0.03, -0.105, -0.045, -0.1, -0.05);
      mesh(slab(s, 0.22, 0.14, 0.055, 0.012), meatM);
      mesh(slab(rrect(0.2, 0.02, 0.008), 0.2, 0.02, 0.058, 0.006), fat, [0, 0, 0.058]);
      hide(mesh(new THREE.CapsuleGeometry(0.012, 0.16, 4, 10), mat("bone", { color: 0xeee6d6, roughness: 0.7 }, { organic: true }), [-0.01, 0.06, -0.01], [0, 0.15, Math.PI / 2]), "process");
      show(mesh(box(0.003, 0.002, 0.12), mat("cut", { color: 0x5a1218, roughness: 0.6 }, { organic: true }), [0.01, 0.0565, 0], [0, 0.3, 0]), "process");
    },

    fish() {
      const scales = mat("fish", { map: skinTex("#c7cfd6", "#4b6378", "#ffffff"), metalness: 0.4, roughness: 0.35, clearcoat: 0.6 }, { organic: true });
      mesh(sphere(0.05, 24, 14), scales, [0.01, 0.03, 0], null, [2.4, 0.6, 0.7]);
      const tail = new THREE.Shape();
      tail.moveTo(0, 0);
      tail.lineTo(-0.05, 0.035);
      tail.lineTo(-0.04, 0);
      tail.lineTo(-0.05, -0.035);
      tail.lineTo(0, 0);
      mesh(new THREE.ShapeGeometry(tail), mat("fin", { color: 0x6b7f8f, roughness: 0.5, side: THREE.DoubleSide }, { organic: true }), [-0.105, 0.03, 0], [Math.PI / 2, 0, 0]);
      mesh(sphere(0.006, 8, 6), blackPlastic(), [0.11, 0.035, 0.02]);
    },

    slices() {
      const c = v === "ham" ? ["#e79aa0", "#f3c4c4", "#d97b84"] : ["#f2c94c", "#f7da7a", "#e3b437"];
      const m = mat("slice", { map: noiseTex(c[0], c.slice(1), 300, 3), roughness: 0.45, clearcoat: 0.2 }, { organic: true });
      mesh(box(0.15, 0.002, 0.11), mat("paper", { color: 0xf4f1ea, roughness: 0.8 }), [0, 0.001, 0]);
      mesh(merge(Array.from({ length: 6 }, (_, i) => [v === "ham" ? cyl(0.045, 0.045, 0.003, 28) : box(0.09, 0.003, 0.09), { p: [-0.03 + i * 0.012, 0.004 + i * 0.0032, 0], r: [0, 0, 0.05] }])), m);
    },

    bowl() {
      const ceramic = mat("bowl", { color: 0xf3f1ec, roughness: 0.25, clearcoat: 0.5 });
      mesh(lathe([[0, 0], [0.035, 0], [0.04, 0.006], [0.07, 0.04], [0.08, 0.068], [0.077, 0.07], [0.066, 0.042], [0.033, 0.012], [0, 0.012]], 32), ceramic);
      mesh(new THREE.SphereGeometry(0.07, 28, 10, 0, Math.PI * 2, 0, 0.6), mat("curry", { map: noiseTex("#d48a2a", ["#b86a1a", "#e9a94a", "#f3e6c6"], 900, 3), roughness: 0.45, clearcoat: 0.5 }, { organic: true }), [0, 0.0, 0], null, [1, 0.6, 1]);
      mesh(merge(Array.from({ length: 7 }, (_, i) => [box(0.012, 0.002, 0.006), { p: [Math.cos(i * 2) * 0.03, 0.06, Math.sin(i * 2) * 0.03], r: [0, i, 0.2] }])), mat("herb", { color: 0x2f7d32, roughness: 0.6 }, { organic: true }));
    },

    cookie() {
      if (v === "praline") {
        mesh(lathe([[0, 0], [0.028, 0], [0.03, 0.004], [0.026, 0.011], [0.016, 0.015], [0, 0.016]], 28), mat("choc", { color: 0x3b2116, roughness: 0.3, clearcoat: 0.6 }, { organic: true }));
        mesh(new THREE.TorusGeometry(0.014, 0.0018, 6, 24), mat("drizzle", { color: 0xf2e6d0, roughness: 0.4 }, { organic: true }), [0, 0.0145, 0], [Math.PI / 2, 0, 0]);
        return;
      }
      mesh(lathe([[0, 0], [0.028, 0], [0.03, 0.006], [0.027, 0.012], [0, 0.013]], 28), mat("cookie", { map: noiseTex("#c88a45", ["#a9692e", "#dba365"], 600, 2), roughness: 0.85 }, { organic: true }));
      mesh(merge(Array.from({ length: 8 }, (_, i) => [box(0.006, 0.004, 0.006), { p: [Math.cos(i * 2.3) * 0.016 * ((i % 3) / 2 + 0.3), 0.013, Math.sin(i * 2.3) * 0.016 * ((i % 3) / 2 + 0.3)], r: [0.3, i, 0.2] }])), mat("chip", { color: 0x3b2116, roughness: 0.5 }, { organic: true }));
    },

    mealtray() {
      mesh(rblock(W, 0.04, D, 0.008), mat("tray", { color: 0x22252a, roughness: 0.4 }));
      mesh(box(W - 0.03, 0.018, D - 0.03), mat("rice", { map: noiseTex("#f3eee2", ["#e7dfcc", "#ffffff"], 1200, 1.5), roughness: 0.8 }, { organic: true }), [-0.035, 0.03, 0], null, [0.55, 1, 1]);
      mesh(box(W - 0.03, 0.02, D - 0.03), mat("curry", { map: noiseTex("#c0661f", ["#a14d14", "#d98a3a", "#3b7d2a"], 900, 3), roughness: 0.45, clearcoat: 0.5 }, { organic: true }), [0.05, 0.03, 0], null, [0.42, 1, 1]);
      show(mesh(box(W + 0.004, 0.002, D + 0.004), mat("film", { color: 0xeef6fb, roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false }, { glass: true }), [0, 0.041, 0]), "cap");
      show(mesh(box(0.08, 0.0025, 0.05), mat("filmlabel", { map: labelTex("#16a34a", "READY MEAL") }), [0.04, 0.0425, 0.02]), "label");
    },

    seedling() {
      mesh(lathe([[0, 0], [0.028, 0], [0.04, 0.075], [0.038, 0.077], [0.026, 0.004], [0, 0.004]], 24), mat("pot", { color: 0x1d1f22, roughness: 0.7, side: THREE.DoubleSide }));
      mesh(cyl(0.037, 0.037, 0.006, 24), mat("soil", { map: noiseTex("#4a3424", ["#3a2818", "#5e4430"], 700, 2), roughness: 1 }, { organic: true }), [0, 0.07, 0]);
      mesh(cyl(0.002, 0.003, 0.05, 6), mat("stemg", { color: 0x4d8a2a, roughness: 0.7 }, { organic: true }), [0, 0.095, 0]);
      const leaf = mat("seedleaf", { color: 0x4caf50, roughness: 0.5, side: THREE.DoubleSide }, { organic: true });
      mesh(merge(Array.from({ length: 5 }, (_, i) => [sphere(0.02, 10, 6), { p: [Math.cos(i * 1.26) * 0.018, 0.11 + (i % 2) * 0.015, Math.sin(i * 1.26) * 0.018], r: [0, -i * 1.26, 0.4], s: [1, 0.12, 0.5] }])), leaf);
    },

    teatcup() {
      const ss = brightSteel();
      mesh(lathe([[0, 0], [0.03, 0.005], [0.035, 0.03], [0.02, 0.045], [0, 0.045]], 24), ss, [0, 0, 0]);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        mesh(cyl(0.014, 0.012, 0.09, 16), ss, [Math.cos(a) * 0.06, 0.06, Math.sin(a) * 0.06]);
        mesh(cyl(0.012, 0.012, 0.012, 16), blackRubber(), [Math.cos(a) * 0.06, 0.109, Math.sin(a) * 0.06]);
      }
      mesh(new THREE.TorusGeometry(0.035, 0.004, 6, 20), blackRubber(), [0, 0.03, 0], [Math.PI / 2, 0, 0]);
    },

    plug() {
      mesh(rblock(0.1, 0.07, 0.07, 0.015), blackPlastic(), [0.04, 0.005, 0]);
      mesh(cyl(0.03, 0.03, 0.02, 24), mat("plugface", { color: 0x2b2f35, roughness: 0.4 }), [0.1, 0.04, 0], [0, 0, Math.PI / 2]);
      mesh(merge([[cyl(0.006, 0.006, 0.004, 10), { p: [0.111, 0.05, 0.012], r: [0, 0, Math.PI / 2] }], [cyl(0.006, 0.006, 0.004, 10), { p: [0.111, 0.05, -0.012], r: [0, 0, Math.PI / 2] }], [cyl(0.009, 0.009, 0.004, 12), { p: [0.111, 0.025, 0], r: [0, 0, Math.PI / 2] }]]), mat("pins", { color: 0xd4a017, metalness: 0.9, roughness: 0.3 }));
      mesh(new THREE.TorusGeometry(0.03, 0.009, 8, 16, Math.PI), blackPlastic(), [0.02, 0.07, 0]);
      mesh(cyl(0.012, 0.012, 0.08, 12), mat("cable", { color: 0xf97316, roughness: 0.6 }), [-0.05, 0.035, 0], [0, 0, Math.PI / 2]);
    },

    vial() {
      mesh(lathe([[0, 0], [0.011, 0], [0.012, 0.002], [0.012, 0.036], [0.008, 0.04], [0.007, 0.043], [0.0085, 0.044], [0.0085, 0.047], [0.006, 0.047]], 24), glassMat(0xe9f3f6, 0.32));
      show(mesh(cyl(0.0105, 0.0105, 0.022, 20), mat("vialfill", { color: 0xd9ecff, roughness: 0.1, transparent: true, opacity: 0.7, depthWrite: false }), [0, 0.0125, 0]), "fill");
      mesh(cyl(0.0075, 0.0075, 0.005, 16), mat("stopper", { color: 0x7c828a, roughness: 0.85 }), [0, 0.048, 0]);
      show(mesh(lathe([[0, 0.052], [0.0092, 0.052], [0.0092, 0.043], [0.0088, 0.043], [0.0088, 0.0505], [0, 0.0505]], 20), mat("crimp", { color: 0xc9ced6, metalness: 0.9, roughness: 0.25 }, { metal: true, keep: true })), "cap");
      show(mesh(cyl(0.0122, 0.0122, 0.018, 24, true), mat("viallabel", { map: labelTex("#2563eb", "STERILE 10 ml"), side: THREE.DoubleSide }), [0, 0.02, 0]), "label");
    },

    blister() {
      mesh(box(W, 0.002, D), mat("foil", { map: printTex("#e5e7eb", "#2563eb", "PARACETAMOL", "500 mg · 10 tablets", 256, 140), metalness: 0.5, roughness: 0.35 }), [0, 0.001, 0]);
      const bubbles = [], pills = [];
      for (const x of [-0.035, -0.0175, 0, 0.0175, 0.035]) for (const z of [-0.013, 0.013]) {
        bubbles.push([new THREE.SphereGeometry(0.0075, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), { p: [x, 0.002, z], s: [1, 0.9, 1] }]);
        pills.push([cyl(0.0055, 0.0055, 0.0035, 16), { p: [x, 0.004, z] }]);
      }
      mesh(merge(pills), mat("pill", { color: 0xfafafa, roughness: 0.6 }));
      mesh(merge(bubbles), glassMat(0xf5f9fb, 0.28));
    },

    pack() {
      const t = printTex("#fbfbfb", "#2563eb", "Rx 500", "30 tablets", 256, 140);
      mesh(box(W, H, D), mat("pack", { map: t, roughness: 0.6 }, { paint: false }), [0, H / 2, 0]);
    },

    sampletube() {
      const caps = ["#7c3aed", "#dc2626", "#16a34a", "#2563eb", "#f59e0b"];
      mesh(lathe([[0, 0.004], [0.004, 0], [0.0075, 0.004], [0.0075, 0.085], [0.0068, 0.085]], 18), glassMat(0xf1f6f8, 0.35));
      mesh(cyl(0.0068, 0.0068, 0.05, 16), mat("blood", { color: 0x7a0a12, roughness: 0.2, clearcoat: 0.6 }, { organic: true }), [0, 0.03, 0]);
      mesh(cyl(0.0085, 0.0085, 0.016, 16), mat("tubecap", { color: caps[Math.floor(R() * caps.length)], roughness: 0.5 }), [0, 0.092, 0]);
      mesh(cyl(0.0078, 0.0078, 0.04, 18, true), mat("tubelabel", { map: barcodeTex(), side: THREE.DoubleSide }), [0, 0.045, 0]);
    },

    microplate() {
      const wells = tex(256, 172, (x, w, h) => {
        x.fillStyle = "#f8fafc";
        x.fillRect(0, 0, w, h);
        for (let r = 0; r < 8; r++) for (let c = 0; c < 12; c++) {
          x.fillStyle = "#cbd5e1";
          x.beginPath();
          x.arc(20 + c * 19.6, 18 + r * 19.5, 7.5, 0, Math.PI * 2);
          x.fill();
        }
      });
      mesh(box(W, 0.014, D), mat("plate", { map: wells, roughness: 0.4 }), [0, 0.007, 0]);
      const filled = tex(256, 172, (x, w, h) => {
        x.clearRect(0, 0, w, h);
        for (let r = 0; r < 8; r++) for (let c = 0; c < 12; c++) {
          x.fillStyle = `hsl(${200 + r * 12}, 80%, ${45 + c * 2}%)`;
          x.beginPath();
          x.arc(20 + c * 19.6, 18 + r * 19.5, 6, 0, Math.PI * 2);
          x.fill();
        }
      });
      show(mesh(new THREE.PlaneGeometry(W, D), mat("wellfill", { map: filled, transparent: true, roughness: 0.2 }), [0, 0.0145, 0], [-Math.PI / 2, 0, 0]), "fill");
    },

    wafer() {
      const disc = cyl(0.075, 0.075, 0.0008, 64);
      mesh(disc, mat("wafer", { color: 0x8d97a6, metalness: 0.9, roughness: 0.12, iridescence: 1, iridescenceIOR: 1.6, iridescenceThicknessRange: [200, 600] }), [0, 0.0004, 0]);
      const grid = tex(256, 256, (x, w, h) => {
        x.clearRect(0, 0, w, h);
        x.strokeStyle = "rgba(255,255,255,0.25)";
        for (let i = 8; i < w; i += 16) {
          x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke();
          x.beginPath(); x.moveTo(0, i); x.lineTo(w, i); x.stroke();
        }
      });
      mesh(new THREE.CircleGeometry(0.073, 64), mat("dies", { map: grid, transparent: true, metalness: 0.5, roughness: 0.2 }), [0, 0.00085, 0], [-Math.PI / 2, 0, 0]);
    },

    reel() {
      const reelM = mat("reel", { color: 0x2563eb, roughness: 0.35, transparent: true, opacity: 0.85 });
      mesh(cyl(0.09, 0.09, 0.0015, 48), reelM, [0, 0.001, 0]);
      mesh(cyl(0.09, 0.09, 0.0015, 48), reelM, [0, 0.013, 0]);
      mesh(cyl(0.068, 0.068, 0.011, 48), mat("tape", { color: 0x1c1d20, roughness: 0.5 }), [0, 0.007, 0]);
      mesh(cyl(0.03, 0.03, 0.012, 24), whitePlastic(), [0, 0.007, 0]);
      mesh(box(0.05, 0.001, 0.03), mat("reellabel", { map: barcodeTex() }), [0.045, 0.0145, 0]);
    },

    pcb() {
      const board = tex(256, 192, (x, w, h) => {
        x.fillStyle = "#14532d";
        x.fillRect(0, 0, w, h);
        x.strokeStyle = "#d4a95a";
        x.lineWidth = 1.5;
        for (let i = 0; i < 45; i++) {
          x.beginPath();
          let px = R() * w, py = R() * h;
          x.moveTo(px, py);
          px += (R() - 0.5) * 120;
          x.lineTo(px, py);
          py += (R() - 0.5) * 80;
          x.lineTo(px, py);
          x.stroke();
        }
        x.fillStyle = "#e5e7eb";
        for (let i = 0; i < 60; i++) x.fillRect(R() * w, R() * h, 3, 3);
      });
      mesh(box(W, 0.0016, D), mat("pcb", { map: board, roughness: 0.45, clearcoat: 0.3 }), [0, 0.0008, 0]);
      mesh(merge([[box(0.025, 0.003, 0.025), { p: [-0.02, 0.003, 0.01] }], [box(0.014, 0.0025, 0.01), { p: [0.03, 0.003, -0.02] }], [box(0.01, 0.002, 0.006), { p: [0.035, 0.003, 0.025] }], [box(0.018, 0.0025, 0.008), { p: [-0.035, 0.003, -0.028] }]]), mat("ic", { color: 0x16181b, roughness: 0.5 }));
      const tht = [];
      for (let i = 0; i < 3; i++) tht.push([cyl(0.005, 0.005, 0.012, 14), { p: [0.01 + i * 0.013, 0.008, 0.03] }]);
      show(mesh(merge(tht), mat("cap", { color: 0x1e3a8a, roughness: 0.4 })), "assemble");
      show(mesh(box(0.035, 0.009, 0.008), blackPlastic(), [-0.03, 0.006, 0.036]), "assemble");
      show(mesh(merge(Array.from({ length: 10 }, (_, i) => [sphere(0.0016, 6, 4), { p: [-0.045 + (i % 5) * 0.006, 0.0018, -0.035 + Math.floor(i / 5) * 0.006] }])), mat("solder", { color: 0xd8dde3, metalness: 1, roughness: 0.2 })), "weld");
      show(mesh(box(W, 0.0006, D), mat("conformal", { color: 0xeef6ff, roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false }, { glass: true }), [0, 0.0019, 0]), "apply");
    },

    cell() {
      mesh(cyl(0.0105, 0.0105, 0.068, 24), mat("cellwrap", { map: printTex("#1d4ed8", "#93c5fd", "21700", "3.6V 5000mAh", 128, 96), roughness: 0.3, clearcoat: 0.5 }), [0, 0.034, 0]);
      mesh(cyl(0.0095, 0.0095, 0.0025, 20), brightSteel(), [0, 0.0695, 0]);
      mesh(cyl(0.004, 0.004, 0.002, 12), brightSteel(), [0, 0.0715, 0]);
    },

    module() {
      mesh(rblock(W, 0.075, D, 0.004), mat("holder", { color: 0x3a3f46, roughness: 0.6 }));
      const tops = [];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) tops.push([cyl(0.013, 0.013, 0.004, 18), { p: [-0.055 + i * 0.037, 0.077, -0.035 + j * 0.035] }]);
      mesh(merge(tops), brightSteel());
      const bars = [];
      for (let i = 0; i < 4; i++) bars.push([box(0.012, 0.0025, 0.09), { p: [-0.055 + i * 0.037, 0.0805, 0] }]);
      show(mesh(merge(bars), copper()), "assemble");
      mesh(merge([[box(0.006, 0.075, D), { p: [W / 2 - 0.003, 0.0375, 0] }], [box(0.006, 0.075, D), { p: [-W / 2 + 0.003, 0.0375, 0] }]]), alu());
    },

    harness() {
      mesh(rblock(0.03, 0.022, 0.05, 0.003), whitePlastic(), [0.08, 0, 0]);
      const cols = [0xdc2626, 0x111827, 0x2563eb, 0x16a34a, 0xf59e0b];
      cols.forEach((c, i) => {
        const z = -0.016 + i * 0.008;
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.066, 0.011, z), new THREE.Vector3(0.0, 0.008 + (i % 2) * 0.004, z * 0.6), new THREE.Vector3(-0.08, 0.01, z * 0.3 + 0.01)]);
        mesh(new THREE.TubeGeometry(curve, 16, 0.0022, 6, false), mat("wire" + c, { color: c, roughness: 0.5 }));
      });
      mesh(cyl(0.007, 0.007, 0.05, 10), mat("tape", { color: 0x111111, roughness: 0.8 }), [-0.03, 0.01, 0.004], [0, 0, Math.PI / 2]);
    },

    crimp() {
      mesh(cyl(0.003, 0.003, 0.1, 10), mat("redwire", { color: 0xdc2626, roughness: 0.5 }), [-0.01, 0.004, 0], [0, 0, Math.PI / 2]);
      mesh(cyl(0.0012, 0.0012, 0.008, 6), copper(), [0.044, 0.004, 0], [0, 0, Math.PI / 2]);
      show(mesh(box(0.012, 0.004, 0.006), mat("terminal", { color: 0xd1d5db, metalness: 0.9, roughness: 0.25 }), [0.05, 0.004, 0]), "assemble");
      show(mesh(new THREE.TorusGeometry(0.0055, 0.0018, 6, 16), mat("terminal", { color: 0xd1d5db, metalness: 0.9, roughness: 0.25 }), [0.061, 0.004, 0], [Math.PI / 2, 0, 0]), "assemble");
    },

    cabinet() {
      mesh(box(W, 0.004, D), mat("galv", { map: noiseTex("#c3c9cf", ["#b4bac1", "#d2d8de"], 1500, 2), metalness: 0.7, roughness: 0.4 }, { metal: true }), [0, 0.002, 0]);
      mesh(merge([[box(0.27, 0.007, 0.035), { p: [0, 0.008, -0.06] }], [box(0.27, 0.007, 0.035), { p: [0, 0.008, 0.06] }]]), brightSteel());
      const brk = [];
      for (let i = 0; i < 8; i++) brk.push([box(0.018, 0.05, 0.045), { p: [-0.1 + i * 0.022, 0.035, -0.06] }]);
      mesh(merge(brk), whitePlastic());
      mesh(merge([[box(0.28, 0.04, 0.03), { p: [0, 0.024, 0.0] }], [box(0.28, 0.04, 0.03), { p: [0, 0.024, 0.1] }]]), mat("duct", { color: 0x9ca3af, roughness: 0.6 }));
      show(mesh(merge(Array.from({ length: 6 }, (_, i) => [cyl(0.002, 0.002, 0.06, 6), { p: [-0.09 + i * 0.03, 0.05, -0.03], r: [Math.PI / 2, 0, 0] }])), mat("wireblue", { color: 0x1d4ed8, roughness: 0.5 })), "assemble");
    },

    stator() {
      const ring = lathe([[0.055, 0], [0.09, 0], [0.09, 0.06], [0.055, 0.06], [0.055, 0]], 48);
      mesh(ring, mat("lam", { map: tex(256, 32, (x, w, h) => {
        x.fillStyle = "#6b7280";
        x.fillRect(0, 0, w, h);
        x.fillStyle = "#4b5563";
        for (let i = 0; i < w; i += 3) x.fillRect(i, 0, 1, h);
      }), metalness: 0.7, roughness: 0.4 }, { metal: true }));
      const pins = [];
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        pins.push([new THREE.TorusGeometry(0.01, 0.0025, 4, 8, Math.PI), { p: [Math.cos(a) * 0.065, 0.062, Math.sin(a) * 0.065], r: [0, -a, 0] }]);
      }
      show(mesh(merge(pins), copper()), "assemble");
    },

    lamination() {
      const e = new THREE.Shape();
      e.moveTo(-0.12, -0.1); e.lineTo(0.12, -0.1); e.lineTo(0.12, 0.1); e.lineTo(0.08, 0.1); e.lineTo(0.08, -0.06);
      e.lineTo(0.03, -0.06); e.lineTo(0.03, 0.1); e.lineTo(-0.03, 0.1); e.lineTo(-0.03, -0.06); e.lineTo(-0.08, -0.06);
      e.lineTo(-0.08, 0.1); e.lineTo(-0.12, 0.1); e.lineTo(-0.12, -0.1);
      mesh(slab(e, 0.24, 0.2, 0.03, 0), mat("elam", { map: tex(64, 64, (x, w, h) => {
        x.fillStyle = "#5b6b80";
        x.fillRect(0, 0, w, h);
        x.fillStyle = "#4a586b";
        for (let i = 0; i < h; i += 3) x.fillRect(0, i, w, 1);
      }), metalness: 0.65, roughness: 0.35 }, { metal: true }));
    },

    carton() {
      const kraft = (top) =>
        tex(256, 192, (x, w, h) => {
          x.fillStyle = "#c49a63";
          x.fillRect(0, 0, w, h);
          for (let i = 0; i < 300; i++) {
            x.fillStyle = `rgba(120,80,40,${R() * 0.08})`;
            x.fillRect(R() * w, R() * h, 2, 2);
          }
          if (top) {
            x.fillStyle = "#b9a27e";
            x.fillRect(0, h * 0.44, w, h * 0.12);
            x.fillStyle = "rgba(255,255,255,0.25)";
            x.fillRect(0, h * 0.46, w, h * 0.02);
          } else {
            x.strokeStyle = "#3b2a1a";
            x.lineWidth = 3;
            x.beginPath();
            x.moveTo(w * 0.12, h * 0.4); x.lineTo(w * 0.12, h * 0.2); x.lineTo(w * 0.08, h * 0.26); x.moveTo(w * 0.12, h * 0.2); x.lineTo(w * 0.16, h * 0.26);
            x.stroke();
            x.fillStyle = "#3b2a1a";
            x.font = "700 18px Inter, Arial, sans-serif";
            x.fillText("FRAGILE · THIS SIDE UP", w * 0.24, h * 0.32);
          }
        });
      const side = mat("cartonside", { map: kraft(false), roughness: 0.9 });
      const top = mat("cartontop", { map: kraft(true), roughness: 0.85 });
      const o = mesh(box(W, H, D), side, [0, H / 2, 0]);
      o.material = [side, side, top, side, side, side];
      delete o.userData.mat;
      show(mesh(box(0.1, 0.002, 0.07), mat("shiplabel", { map: barcodeTex() }), [0.06, H + 0.001, 0.04]), "label");
    },

    bottle() {
      const b = BOTTLES[v] || BOTTLES.water;
      const rr = W / 2;
      const prof = b.longneck
        ? [[0, 0.003], [rr * 0.9, 0], [rr, 0.006], [rr, 0.12], [rr * 0.85, 0.15], [0.012, 0.175], [0.012, 0.225], [0.0135, 0.228], [0.0135, 0.232], [0.011, 0.232]]
        : [[0, 0.004], [rr * 0.8, 0], [rr, 0.01], [rr * 0.97, 0.06], [rr * 0.9, 0.075], [rr, 0.09], [rr, 0.13], [rr * 0.7, 0.16], [0.014, 0.18], [0.014, 0.196], [0.017, 0.198], [0.017, 0.2], [0.0135, 0.2]];
      const body = b.opaque ? mat("hdpe", { color: b.opaque, roughness: 0.45 }) : glassMat(new THREE.Color(b.glass).getHex(), b.pet ? 0.28 : 0.6);
      mesh(lathe(prof, 32), body);
      const fillTop = b.longneck ? 0.18 : 0.15;
      if (!b.opaque) {
        const liq = prof.filter(([, y]) => y <= fillTop).map(([r, y]) => [Math.max(0, r - 0.002), Math.max(0.002, y)]);
        liq.push([0, fillTop]);
        show(mesh(lathe(liq, 28), mat("liquid", { color: b.liquid, roughness: 0.08, transparent: true, opacity: 0.85, depthWrite: false })), "fill");
      }
      const capY = b.longneck ? 0.234 : 0.205;
      show(mesh(cyl(0.0155, 0.0155, b.longneck ? 0.008 : 0.016, 20), mat("bcap", { color: b.cap, roughness: 0.4, metalness: b.longneck ? 0.7 : 0 }), [0, capY, 0]), "cap");
      show(mesh(cyl(rr + 0.0008, rr + 0.0008, 0.05, 32, true), mat("blabel", { map: labelTex(b.band, b.label.split(" ")[0].toUpperCase()), side: THREE.DoubleSide, roughness: 0.6 }), [0, b.longneck ? 0.07 : 0.11, 0]), "label");
    },

    jar() {
      mesh(lathe([[0, 0.003], [0.034, 0], [0.0375, 0.006], [0.0375, 0.075], [0.033, 0.085], [0.03, 0.088], [0.03, 0.094], [0.028, 0.094]], 32), glassMat(0xeef5f2, 0.3));
      show(mesh(cyl(0.035, 0.035, 0.07, 28), mat("jam", { color: 0x8b1020, roughness: 0.2, clearcoat: 0.8 }, { organic: true }), [0, 0.04, 0]), "fill");
      show(mesh(cyl(0.032, 0.032, 0.012, 28), mat("lid", { color: 0xd4a017, metalness: 0.85, roughness: 0.3 }), [0, 0.094, 0]), "cap");
      show(mesh(cyl(0.0378, 0.0378, 0.04, 32, true), mat("jarlabel", { map: labelTex("#b91c1c", "STRAWBERRY JAM"), side: THREE.DoubleSide }), [0, 0.04, 0]), "label");
    },

    can() {
      mesh(lathe([[0, 0.004], [0.026, 0], [0.033, 0.01], [0.033, 0.108], [0.029, 0.118], [0.0275, 0.118]], 32), mat("canbody", { map: printTex("#dc2626", "#ffffff", "COLA", "330 ml", 256, 160), metalness: 0.7, roughness: 0.3 }, { metal: true, keep: true }));
      show(mesh(cyl(0.028, 0.028, 0.004, 28), mat("canlid", { color: 0xd8dde3, metalness: 0.9, roughness: 0.2 }), [0, 0.12, 0]), "cap");
    },

    tote() {
      const pp = mat("tote", { color: v === "red" ? 0xb91c1c : 0x1f5fb8, roughness: 0.55 });
      const t = 0.008;
      mesh(merge([[box(W, t, D), { p: [0, t / 2, 0] }], [box(W, H, t), { p: [0, H / 2, D / 2 - t / 2] }], [box(W, H, t), { p: [0, H / 2, -D / 2 + t / 2] }], [box(t, H, D), { p: [W / 2 - t / 2, H / 2, 0] }], [box(t, H, D), { p: [-W / 2 + t / 2, H / 2, 0] }]]), pp);
      mesh(merge([[box(W + 0.01, 0.012, 0.012), { p: [0, H - 0.006, D / 2] }], [box(W + 0.01, 0.012, 0.012), { p: [0, H - 0.006, -D / 2] }], [box(0.012, 0.012, D), { p: [W / 2, H - 0.006, 0] }], [box(0.012, 0.012, D), { p: [-W / 2, H - 0.006, 0] }]]), pp);
      mesh(merge([[box(0.15, 0.1, 0.12), { p: [-0.09, 0.058, -0.05] }], [box(0.12, 0.08, 0.1), { p: [0.1, 0.048, 0.06] }]]), mat("toteitems", { color: 0xc49a63, roughness: 0.9 }));
      mesh(box(0.1, 0.12, 0.08), mat("toteitem2", { map: printTex("#ffffff", "#ea580c", "SKU", "A-114", 128, 96), roughness: 0.6 }), [0.08, 0.068, -0.07]);
    },

    parcel() {
      mesh(rblock(W, H, D, 0.022), mat("mailer", { color: 0x9aa3ad, roughness: 0.55, clearcoat: 0.2 }));
      mesh(box(0.1, 0.002, 0.07), mat("shiplabel", { map: barcodeTex() }), [0.04, H - 0.003, 0.02]);
    },

    sack() {
      const s = SACKS[v] || SACKS.cement;
      const empty = v === "empty";
      const t = empty ? printTex("#f4f1e8", "#334155", "50 kg", "valve bag", 256, 160) : printTex(s.base, s.print, s.text, `${s.kg} kg net`, 256, 160);
      const m = mat("sack", { map: t, roughness: s.paper ? 0.9 : 0.75, sheen: s.paper ? 0 : 0.5, sheenColor: new THREE.Color(0xffffff) });
      if (empty) mesh(box(W, 0.012, D), m, [0, 0.006, 0]);
      else {
        const b = H * 0.45;
        mesh(slab(rrect(W - 1.6 * b, D - 1.6 * b, 0.04), W, D, H, b), m);
      }
    },

    bale() {
      const c = v === "jute" ? ["#9b7a4a", "#8a6a3a", "#b08d5a"] : v === "hay" ? ["#d9c27a", "#c9ae5e", "#e8d59a"] : v === "paper" ? ["#9aa3ad", "#c49a63", "#e5e7eb", "#2563eb"] : ["#f3f1ea", "#e6e2d6", "#ffffff"];
      mesh(rblock(W, H, D, 0.02), mat("bale", { map: noiseTex(c[0], c.slice(1), 2500, 3), roughness: 1 }, { organic: true }));
      mesh(merge([-0.15, -0.05, 0.05, 0.15].map((x) => [box(0.012, H + 0.006, D + 0.006), { p: [x, H / 2, 0] }])), mat("strap", { color: 0x2f3b4a, metalness: 0.6, roughness: 0.4 }));
    },

    bobbin() {
      const yarn = tex(64, 128, (x, w, h) => {
        x.fillStyle = "#c2410c";
        x.fillRect(0, 0, w, h);
        for (let i = 0; i < h; i += 2) {
          x.fillStyle = `rgba(255,255,255,${0.05 + R() * 0.08})`;
          x.fillRect(0, i, w, 1);
        }
      });
      mesh(lathe([[0.022, 0], [0.068, 0.006], [0.07, 0.012], [0.05, 0.15], [0.026, 0.152]], 32), mat("yarn", { map: yarn, roughness: 0.95, sheen: 1, sheenColor: new THREE.Color(0xffd0b0) }, { organic: true }));
      mesh(lathe([[0.019, 0], [0.024, 0], [0.019, 0.16], [0.014, 0.16]], 24), mat("tube", { color: 0xd9c49a, roughness: 0.8, side: THREE.DoubleSide }));
    },

    garment() {
      const fabric = mat("fabric", { map: noiseTex("#1f5fb8", ["#2563eb", "#1e3a8a"], 1500, 1.5), roughness: 0.95, sheen: 1, sheenColor: new THREE.Color(0x9ec5ff) }, { organic: true });
      mesh(rblock(W, H, D, 0.012), fabric);
      mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 16, Math.PI), fabric, [0, H, -D / 2 + 0.035], [-Math.PI / 2, 0, 0]);
      mesh(box(0.02, 0.002, 0.08), mat("placket", { color: 0x1e3a8a, roughness: 0.9 }), [0, H + 0.001, -0.03]);
    },

    bundle() {
      const pipes = [];
      const r = 0.03;
      for (const [y, z] of [[0, 0], [0, 2 * r], [0, -2 * r], [Math.sqrt(3) * r, r], [Math.sqrt(3) * r, -r], [2 * Math.sqrt(3) * r, 0]]) pipes.push([cyl(r, r, W, 16), { p: [0, r + y, z], r: [0, 0, Math.PI / 2] }]);
      mesh(merge(pipes), steel());
      mesh(merge([-0.15, 0.15].map((x) => [box(0.015, H + 0.004, D + 0.004), { p: [x, H / 2, 0] }])), mat("strap", { color: 0x2f3b4a, metalness: 0.6, roughness: 0.4 }));
    },

    tile() {
      const t = tex(256, 256, (x, w, h) => {
        x.fillStyle = "#e9e4dc";
        x.fillRect(0, 0, w, h);
        x.strokeStyle = "rgba(120,110,100,0.35)";
        for (let i = 0; i < 9; i++) {
          x.lineWidth = 0.5 + R() * 2;
          x.beginPath();
          x.moveTo(R() * w, 0);
          x.bezierCurveTo(R() * w, h * 0.3, R() * w, h * 0.7, R() * w, h);
          x.stroke();
        }
      });
      mesh(box(W, H, D), mat("tile", { map: t, roughness: 0.15, clearcoat: 0.8 }, { stone: true }), [0, H / 2, 0]);
    },

    waste() {
      const geo = lathe([[0, 0], [0.03, 0.005], [0.032, 0.12], [0.02, 0.16], [0.012, 0.18], [0.012, 0.2]], 18);
      const pa = geo.attributes.position;
      for (let i = 0; i < pa.count; i++) pa.setXYZ(i, pa.getX(i) * (0.6 + 0.4 * Math.abs(Math.sin(pa.getY(i) * 60))), pa.getY(i), pa.getZ(i) * 0.45);
      geo.computeVertexNormals();
      mesh(geo, glassMat(0xbfe3ff, 0.5), [-0.1, 0.03, 0], [0, 0, -Math.PI / 2]);
      mesh(cyl(0.014, 0.014, 0.015, 14), mat("wcap", { color: 0x2563eb, roughness: 0.5 }), [0.104, 0.03, 0], [0, 0, Math.PI / 2]);
    },

    gem() {
      mesh(lathe([[0, 0], [0.0075, 0.0065], [0.01, 0.008], [0.0065, 0.0115], [0, 0.0118]], 8), mat("diamond", { color: 0xf8fbff, metalness: 0.1, roughness: 0, envMapIntensity: 3, flatShading: true, iridescence: 0.6, clearcoat: 1 }));
    },

    glass() {
      mesh(box(W, H, D), glassMat(0xcfe8e2, 0.28), [0, H / 2, 0]);
      mesh(merge([[box(W, H, 0.004), { p: [0, H / 2, D / 2] }], [box(W, H, 0.004), { p: [0, H / 2, -D / 2] }], [box(0.004, H, D), { p: [W / 2, H / 2, 0] }], [box(0.004, H, D), { p: [-W / 2, H / 2, 0] }]]), mat("glassedge", { color: 0x6fa58f, roughness: 0.1, transparent: true, opacity: 0.85 }, { glass: true }));
    },

    windshield() {
      const geo = new THREE.CylinderGeometry(0.9, 0.9, D, 32, 1, true, -0.34, 0.68);
      geo.rotateX(-Math.PI / 2);
      const frit = tex(256, 160, (x, w, h) => {
        x.clearRect(0, 0, w, h);
        x.fillStyle = "rgba(10,12,14,0.95)";
        x.fillRect(0, 0, w, 16);
        x.fillRect(0, h - 16, w, 16);
        x.fillRect(0, 0, 16, h);
        x.fillRect(w - 16, 0, 16, h);
      });
      mesh(geo, glassMat(0x9fc7c9, 0.32), [0, -0.83, 0]);
      mesh(geo.clone(), mat("frit", { map: frit, transparent: true, roughness: 0.3, side: THREE.DoubleSide, depthWrite: false }), [0, -0.8295, 0]);
      // Urethane bead on the frit, following the curve of the glass.
      const glassY = (x) => Math.sqrt(0.81 - x * x) - 0.83 - 0.006;
      const ring = [];
      for (let i = 0; i <= 6; i++) ring.push([-0.27 + i * 0.09, -0.17]);
      for (let i = 1; i <= 3; i++) ring.push([0.27, -0.17 + i * 0.085]);
      for (let i = 1; i <= 6; i++) ring.push([0.27 - i * 0.09, 0.17]);
      for (let i = 1; i < 4; i++) ring.push([-0.27, 0.17 - i * 0.085]);
      const bead = new THREE.CatmullRomCurve3(ring.map(([x, z]) => new THREE.Vector3(x, glassY(x), z)), true);
      show(mesh(new THREE.TubeGeometry(bead, 96, 0.005, 6, true), mat("urethane", { color: 0x111111, roughness: 0.4 })), "apply");
    },

    slab() {
      const marble = v === "marble";
      const t = tex(256, 192, (x, w, h) => {
        x.fillStyle = marble ? "#f1efea" : "#3a3d42";
        x.fillRect(0, 0, w, h);
        if (marble) {
          x.strokeStyle = "rgba(110,110,120,0.45)";
          for (let i = 0; i < 12; i++) {
            x.lineWidth = 0.5 + R() * 2.5;
            x.beginPath();
            x.moveTo(0, R() * h);
            x.bezierCurveTo(w * 0.3, R() * h, w * 0.6, R() * h, w, R() * h);
            x.stroke();
          }
        } else {
          for (let i = 0; i < 4000; i++) {
            x.fillStyle = ["#111214", "#6b6f75", "#c9ccd1", "#8a5a4a", "#202226"][Math.floor(R() * 5)];
            x.fillRect(R() * w, R() * h, 1 + R() * 3, 1 + R() * 3);
          }
        }
      });
      mesh(box(W, H, D), mat("stone", { map: t, roughness: 0.55, metalness: 0 }, { stone: true }), [0, H / 2, 0]);
    },

    tyre() {
      const tread = tex(256, 64, (x, w, h) => {
        x.fillStyle = "#1c1d20";
        x.fillRect(0, 0, w, h);
        x.fillStyle = "#0b0c0d";
        for (let i = 0; i < w; i += 8) {
          x.fillRect(i, 0, 3, h);
        }
        x.fillRect(0, h * 0.3, w, 3);
        x.fillRect(0, h * 0.65, w, 3);
      });
      const rubber = mat("tyre", { map: tread, roughness: 0.9 });
      const torus = new THREE.TorusGeometry(0.2, 0.075, 18, 48);
      torus.scale(1, 1, 1.25);
      mesh(torus, rubber, [0, 0.095, 0], [Math.PI / 2, 0, 0]);
      mesh(lathe([[0.15, 0.015], [0.165, 0.02], [0.17, 0.095], [0.165, 0.17], [0.15, 0.175], [0.14, 0.11], [0.06, 0.11], [0.06, 0.1], [0.14, 0.1]], 40), mat("rim", { color: 0xc9ced6, metalness: 0.85, roughness: 0.25 }, { metal: true, keep: true }));
      const spokes = [];
      for (let i = 0; i < 5; i++) spokes.push([box(0.09, 0.012, 0.026), { p: [Math.cos((i / 5) * Math.PI * 2) * 0.1, 0.105, Math.sin((i / 5) * Math.PI * 2) * 0.1], r: [0, -(i / 5) * Math.PI * 2, 0] }]);
      mesh(merge(spokes), mat("rim", { color: 0xc9ced6, metalness: 0.85, roughness: 0.25 }, { metal: true, keep: true }));
      mesh(cyl(0.05, 0.05, 0.02, 24), mat("hub", { color: 0x4b5563, metalness: 0.8, roughness: 0.35 }), [0, 0.105, 0]);
    },

    coil() {
      const roll = v === "roll";
      const ring = tex(16, 256, (x, w, h) => {
        x.fillStyle = roll ? "#d9c7a0" : "#8e99a6";
        x.fillRect(0, 0, w, h);
        for (let i = 0; i < h; i += 2) {
          x.fillStyle = roll ? `rgba(120,90,40,${R() * 0.25})` : `rgba(40,48,60,${0.2 + R() * 0.3})`;
          x.fillRect(0, i, w, 1);
        }
      });
      const rIn = 0.08, rOut = 0.2, wdt = W;
      const geo = lathe([[rIn, -wdt / 2], [rOut, -wdt / 2], [rOut, wdt / 2], [rIn, wdt / 2], [rIn, -wdt / 2]], 48);
      mesh(geo, mat("coil", { map: ring, metalness: roll ? 0 : 0.75, roughness: roll ? 0.85 : 0.35 }, roll ? {} : { metal: true }), [0, rOut, 0], [0, 0, Math.PI / 2]);
      if (!roll) mesh(merge([-0.08, 0.08].map((x) => [new THREE.TorusGeometry(rOut + 0.002, 0.004, 4, 40), { p: [x, rOut, 0], r: [0, Math.PI / 2, 0] }])), mat("strap", { color: 0x2f3b4a, metalness: 0.6, roughness: 0.4 }));
    },

    brick() {
      if (v === "block") {
        const s = rrect(W, D, 0.004);
        for (const x of [-0.095, 0.095]) {
          const hole = new THREE.Path();
          hole.absarc(x, 0, 0.055, 0, Math.PI * 2, false);
          s.holes.push(hole);
        }
        mesh(slab(s, W, D, H, 0), mat("concrete", { map: noiseTex("#9aa0a6", ["#878d93", "#b2b7bc", "#6b7177"], 2500, 2), roughness: 0.95 }, { stone: true }));
        return;
      }
      const base = v === "flyash" ? "#8f959b" : "#a9472f";
      mesh(box(W, H, D), mat("brick", { map: noiseTex(base, v === "flyash" ? ["#7f858b", "#a3a9ae"] : ["#8f3a25", "#c05a3c", "#6f2a1a"], 1800, 2.5), roughness: 0.95 }, { stone: true }), [0, H / 2, 0]);
    },

    sheet() {
      const galv = mat("galv", { map: noiseTex("#c3c9cf", ["#b4bac1", "#d2d8de", "#aab1b8"], 2200, 3), metalness: 0.75, roughness: 0.35 }, { metal: true, paint: true });
      const flat = mesh(box(W, 0.003, D), galv, [0, 0.0015, 0]);
      if (v === "bent") {
        hide(flat, "process");
        show(mesh(box(W * 0.62, 0.003, D), galv, [0.095, 0.0015, 0]), "process");
        show(mesh(box(0.003, 0.055, D), galv, [-0.0925, 0.028, 0]), "process");
      } else if (v === "stamped") {
        hide(flat, "process");
        show(mesh(box(W, 0.003, D), galv, [0, 0.0015, 0]), "process");
        show(mesh(rblock(0.3, 0.045, 0.2, 0.02), galv, [0, 0.003, 0]), "process");
      } else if (v === "nested") {
        const cuts = tex(256, 180, (x, w, h) => {
          x.clearRect(0, 0, w, h);
          x.strokeStyle = "rgba(20,24,30,0.9)";
          x.lineWidth = 2;
          for (let i = 0; i < 6; i++) {
            const cx = 30 + (i % 3) * 80, cy = 45 + Math.floor(i / 3) * 90;
            x.strokeRect(cx, cy - 30, 60, 60);
            x.beginPath();
            x.arc(cx + 30, cy, 12, 0, Math.PI * 2);
            x.stroke();
          }
        });
        show(mesh(new THREE.PlaneGeometry(W, D), mat("nest", { map: cuts, transparent: true, depthWrite: false }), [0, 0.0032, 0], [-Math.PI / 2, 0, 0]), "process");
      }
    },

    panel() {
      mesh(box(W, H, D), mat("laminate", { map: tex(256, 160, (x, w, h) => {
        x.fillStyle = "#c9a27a";
        x.fillRect(0, 0, w, h);
        for (let i = 0; i < 70; i++) {
          x.strokeStyle = `rgba(110,70,35,${0.05 + R() * 0.12})`;
          x.lineWidth = 1 + R() * 2;
          x.beginPath();
          const y = R() * h;
          x.moveTo(0, y);
          x.bezierCurveTo(w * 0.35, y + R() * 10 - 5, w * 0.65, y + R() * 10 - 5, w, y + R() * 6 - 3);
          x.stroke();
        }
      }), roughness: 0.55, clearcoat: 0.3 }, { paint: true }), [0, H / 2, 0]);
      mesh(merge([[box(W, H + 0.001, 0.002), { p: [0, H / 2, D / 2] }], [box(W, H + 0.001, 0.002), { p: [0, H / 2, -D / 2] }]]), mat("edgeband", { color: 0x7a5232, roughness: 0.5 }));
    },

    pipe() {
      const r = 0.035;
      const tube = (len) => lathe([[r - 0.004, -len / 2], [r, -len / 2], [r, len / 2], [r - 0.004, len / 2], [r - 0.004, -len / 2]], 28);
      const m = mat("pipe", { color: 0x7d8792, metalness: 0.75, roughness: 0.38, side: THREE.DoubleSide }, { metal: true, paint: true });
      if (v === "bent") {
        hide(mesh(tube(0.45), m, [0, r, -0.075], [0, 0, Math.PI / 2]), "process");
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.22, r, -0.075), new THREE.Vector3(-0.02, r, -0.075), new THREE.Vector3(0.08, r, -0.03), new THREE.Vector3(0.12, r, 0.07), new THREE.Vector3(0.12, r, 0.1)]);
        show(mesh(new THREE.TubeGeometry(curve, 40, r, 16, false), m), "process");
        return;
      }
      if (v === "weld") {
        mesh(tube(0.22), m, [-0.112, r, 0], [0, 0, Math.PI / 2]);
        mesh(tube(0.22), m, [0.112, r, 0], [0, 0, Math.PI / 2]);
        show(mesh(new THREE.TorusGeometry(r + 0.001, 0.005, 8, 32), mat("weldring", { color: 0x6b5a48, metalness: 0.7, roughness: 0.45 }), [0, r, 0], [0, Math.PI / 2, 0]), "weld");
        return;
      }
      mesh(tube(0.45), m, [0, r, 0], [0, 0, Math.PI / 2]);
    },

    profile() {
      const s = rrect(0.04, 0.04, 0.003);
      const hole = new THREE.Path();
      hole.absarc(0, 0, 0.0055, 0, Math.PI * 2, true);
      s.holes.push(hole);
      for (const [x, y, w, h] of [[0, 0.0155, 0.008, 0.005], [0, -0.0155, 0.008, 0.005], [0.0155, 0, 0.005, 0.008], [-0.0155, 0, 0.005, 0.008]]) {
        const p = new THREE.Path();
        p.moveTo(x - w / 2, y - h / 2); p.lineTo(x - w / 2, y + h / 2); p.lineTo(x + w / 2, y + h / 2); p.lineTo(x + w / 2, y - h / 2); p.lineTo(x - w / 2, y - h / 2);
        s.holes.push(p);
      }
      const geo = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: false });
      geo.translate(0, 0, -W / 2);
      geo.rotateY(Math.PI / 2);
      mesh(geo, mat("anod", { color: 0xd3d8de, metalness: 0.8, roughness: 0.32 }, { metal: true }), [0, 0.02, 0]);
    },

    casting() {
      const m = castAlu();
      mesh(rblock(0.14, 0.07, 0.1, 0.012), m, [0, 0, 0]);
      mesh(merge([[cyl(0.022, 0.022, 0.03, 20), { p: [0.035, 0.08, 0] }], [cyl(0.015, 0.015, 0.02, 16), { p: [-0.04, 0.078, 0.025] }]]), m);
      mesh(merge([[box(0.16, 0.012, 0.012), { p: [0, 0.006, 0.05] }], [box(0.16, 0.012, 0.012), { p: [0, 0.006, -0.05] }]]), m);
      hide(mesh(cyl(0.012, 0.018, 0.03, 14), m, [-0.04, 0.1, -0.02]), "finish");
      hide(mesh(box(0.004, 0.012, 0.1), m, [0.072, 0.03, 0]), "finish");
    },

    core() {
      const sand = mat("sand", { map: noiseTex("#c9b38a", ["#b9a37a", "#d9c59a", "#a8936a"], 2500, 2), roughness: 1 }, { stone: true });
      mesh(rblock(0.16, 0.06, 0.1, 0.012), sand);
      mesh(merge([[cyl(0.018, 0.018, 0.04, 16), { p: [0.09, 0.03, 0], r: [0, 0, Math.PI / 2] }], [cyl(0.018, 0.018, 0.04, 16), { p: [-0.09, 0.03, 0], r: [0, 0, Math.PI / 2] }]]), sand);
    },

    forging() {
      const hot = mat("hot", { color: 0xff7a1a, emissive: 0xff4500, emissiveIntensity: 1.4, roughness: 0.6 });
      hide(mesh(cyl(0.032, 0.032, 0.12, 24), hot, [0, 0.06, 0]), "process");
      show(mesh(lathe([[0, 0], [0.065, 0], [0.065, 0.02], [0.03, 0.03], [0.03, 0.07], [0, 0.07]], 32), hot), "process");
    },

    moulded() {
      const c = coat ? new THREE.Color(coat).getHex() : 0x2563eb;
      const pp = mat("pp", { color: c, roughness: 0.35, clearcoat: 0.2 });
      mesh(rblock(W, 0.04, D, 0.008), pp);
      mesh(merge([[cyl(0.006, 0.006, 0.016, 12), { p: [0.04, 0.046, 0.025] }], [cyl(0.006, 0.006, 0.016, 12), { p: [-0.04, 0.046, -0.025] }], [box(0.09, 0.008, 0.004), { p: [0, 0.044, 0] }]]), pp);
      if (v === "weld") show(mesh(box(W + 0.002, 0.003, D + 0.002), mat("weldline", { color: 0x1e3a8a, roughness: 0.5 }), [0, 0.02, 0]), "weld");
    },

    blowmould() {
      const hdpe = mat("hdpe", { color: 0xf3f3ee, roughness: 0.45 });
      mesh(rblock(0.12, 0.18, 0.08, 0.02), hdpe);
      mesh(new THREE.TorusGeometry(0.03, 0.009, 8, 18, Math.PI), hdpe, [-0.02, 0.18, 0]);
      mesh(cyl(0.016, 0.016, 0.03, 18), hdpe, [0.035, 0.195, 0]);
      hide(mesh(box(0.13, 0.004, 0.003), hdpe, [0, 0.2, 0]), "process");
      hide(mesh(box(0.1, 0.003, 0.003), hdpe, [0, 0.001, 0]), "process");
    },

    rubber() {
      mesh(new THREE.TorusGeometry(0.048, 0.01, 12, 40), blackRubber(), [0, 0.011, 0], [Math.PI / 2, 0, 0]);
      hide(mesh(new THREE.RingGeometry(0.058, 0.064, 40), mat("flash", { color: 0x26292d, roughness: 0.9, side: THREE.DoubleSide }), [0, 0.011, 0], [-Math.PI / 2, 0, 0]), "finish");
    },

    shaft() {
      const raw = mat("bar", { color: 0x5f6772, metalness: 0.6, roughness: 0.6 }, { metal: true, paint: true });
      hide(mesh(cyl(0.025, 0.025, 0.22, 24), raw, [0, 0.025, 0], [0, 0, Math.PI / 2]), "process");
      const prof = [[0, -0.11], [0.015, -0.11], [0.016, -0.108], [0.016, -0.06], [0.02, -0.058], [0.02, 0.0], [0.025, 0.002], [0.025, 0.05], [0.018, 0.052], [0.018, 0.108], [0.016, 0.11], [0, 0.11]];
      const turned = mesh(lathe(prof, 32), brightSteel(), [0, 0.025, 0], [0, 0, Math.PI / 2]);
      if (stages.has("process")) show(turned, "process");
    },

    block() {
      const raw = mat("rawblock", { color: 0x6b737d, metalness: 0.55, roughness: 0.65, map: noiseTex("#6b737d", ["#5c646d", "#7b838c"], 900, 2) }, { metal: true, paint: true });
      const rawM = hide(mesh(box(W, H, D), raw, [0, H / 2, 0]), "process");
      const done = mesh(box(W, H, D), alu(), [0, H / 2, 0]);
      const pocket = mesh(box(0.06, 0.004, 0.05), mat("pocket", { color: 0x3f4650, metalness: 0.7, roughness: 0.4 }), [-0.015, H + 0.0005, 0]);
      const holes = mesh(merge([[0.04, 0.03], [0.04, -0.03]].map(([x, z]) => [cyl(0.007, 0.007, 0.002, 16), { p: [x, H + 0.0005, z] }])), mat("hole", { color: 0x111418, roughness: 0.6 }));
      if (stages.has("process")) [done, pocket, holes].forEach((o) => show(o, "process"));
      else rawM.visible = false;
    },

    bracket() {
      const m = mat("mildsteel", { color: 0x5b6470, metalness: 0.65, roughness: 0.5, map: noiseTex("#5b6470", ["#4f5864", "#69727e"], 800, 2) }, { metal: true, paint: true });
      mesh(box(0.14, 0.008, 0.1), m, [0, 0.004, 0]);
      mesh(box(0.008, 0.07, 0.1), m, [-0.03, 0.043, 0]);
      const gus = new THREE.Shape();
      gus.moveTo(0, 0); gus.lineTo(0.05, 0); gus.lineTo(0, 0.05); gus.lineTo(0, 0);
      const gg = new THREE.ExtrudeGeometry(gus, { depth: 0.006, bevelEnabled: false });
      gg.translate(0, 0, -0.003);
      mesh(gg, m, [-0.026, 0.008, 0]);
      show(mesh(merge([[new THREE.CapsuleGeometry(0.004, 0.09, 3, 8), { p: [-0.0235, 0.012, 0], r: [Math.PI / 2, 0, 0] }], [new THREE.CapsuleGeometry(0.004, 0.09, 3, 8), { p: [-0.0365, 0.012, 0], r: [Math.PI / 2, 0, 0] }]]), weldBead()), "weld");
    },

    frame() {
      const s = new THREE.Shape();
      s.moveTo(-0.06, 0); s.lineTo(0.06, 0); s.lineTo(0.06, 0.012); s.lineTo(0.006, 0.012); s.lineTo(0.006, 0.108); s.lineTo(0.06, 0.108);
      s.lineTo(0.06, 0.12); s.lineTo(-0.06, 0.12); s.lineTo(-0.06, 0.108); s.lineTo(-0.006, 0.108); s.lineTo(-0.006, 0.012); s.lineTo(-0.06, 0.012); s.lineTo(-0.06, 0);
      const geo = new THREE.ExtrudeGeometry(s, { depth: 0.42, bevelEnabled: false });
      geo.translate(0, 0, -0.21);
      geo.rotateY(Math.PI / 2);
      const m = mat("mildsteel", { color: 0x5b6470, metalness: 0.65, roughness: 0.5 }, { metal: true, paint: true });
      mesh(geo, m);
      mesh(box(0.012, 0.12, 0.14), m, [0.216, 0.06, 0]);
      show(mesh(merge([[box(0.008, 0.008, 0.13), { p: [0.208, 0.004, 0] }], [box(0.008, 0.008, 0.13), { p: [0.208, 0.116, 0] }]]), weldBead()), "weld");
    },

    waam() {
      mesh(box(0.2, 0.012, 0.1), mat("mildsteel", { color: 0x5b6470, metalness: 0.65, roughness: 0.5 }, { metal: true }), [0, 0.006, 0]);
      const layers = tex(32, 128, (x, w, h) => {
        x.fillStyle = "#8a8f96";
        x.fillRect(0, 0, w, h);
        for (let i = 0; i < h; i += 8) {
          x.fillStyle = "rgba(40,30,25,0.45)";
          x.fillRect(0, i, w, 2);
          x.fillStyle = "rgba(200,170,120,0.25)";
          x.fillRect(0, i + 3, w, 2);
        }
      });
      show(mesh(rblock(0.16, 0.09, 0.016, 0.006), mat("build", { map: layers, metalness: 0.7, roughness: 0.45 }), [0, 0.012, 0]), "weld");
    },

    sheetpair() {
      const al = v === "fsw";
      const m = al ? alu() : mat("galv", { map: noiseTex("#c3c9cf", ["#b4bac1", "#d2d8de"], 1500, 2), metalness: 0.75, roughness: 0.35 }, { metal: true, paint: true });
      mesh(box(0.3, 0.006, 0.12), m, [0, 0.003, -0.04]);
      mesh(box(0.3, 0.006, 0.12), m, [0, al ? 0.003 : 0.009, 0.04]);
      if (v === "spot") show(mesh(merge(Array.from({ length: 6 }, (_, i) => [cyl(0.0045, 0.0045, 0.001, 12), { p: [-0.125 + i * 0.05, 0.0125, 0.0] }])), mat("spot", { color: 0x5a4a3a, metalness: 0.6, roughness: 0.4 })), "weld");
      else if (v === "rivet") show(mesh(merge(Array.from({ length: 6 }, (_, i) => [new THREE.SphereGeometry(0.0055, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), { p: [-0.125 + i * 0.05, 0.012, 0.0] }])), alu()), "assemble");
      else if (v === "stud") show(mesh(merge(Array.from({ length: 4 }, (_, i) => [cyl(0.004, 0.004, 0.025, 12), { p: [-0.09 + i * 0.06, 0.024, 0.04] }])), brightSteel()), "weld");
      else show(mesh(box(0.3, 0.0015, al ? 0.016 : 0.004), mat("seam", { color: al ? 0xaab2bb : 0x6b5a48, metalness: 0.8, roughness: 0.35, map: al ? noiseTex("#aab2bb", ["#8f98a2"], 400, 1) : null }), [0, al ? 0.0065 : 0.0125, al ? 0.0 : -0.02]), "weld");
    },

    gear() {
      const s = new THREE.Shape();
      const teeth = 24, ro = 0.07, ri = 0.062;
      for (let i = 0; i <= teeth * 4; i++) {
        const a = (i / (teeth * 4)) * Math.PI * 2;
        const r = i % 4 === 1 || i % 4 === 2 ? ro : ri;
        if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      const bore = new THREE.Path();
      bore.absarc(0, 0, 0.018, 0, Math.PI * 2, true);
      s.holes.push(bore);
      mesh(slab(s, 0.14, 0.14, 0.03, 0.002), brightSteel());
    },

    bearing() {
      mesh(rblock(0.14, 0.06, 0.1, 0.008), mat("castiron", { color: 0x4b5058, metalness: 0.5, roughness: 0.7, map: noiseTex("#4b5058", ["#3f444b", "#5a5f67"], 1000, 2) }, { metal: true, paint: true }));
      mesh(cyl(0.032, 0.032, 0.0015, 32), blackPlastic(), [0, 0.0605, 0]);
      show(mesh(lathe([[0.012, 0.055], [0.031, 0.055], [0.031, 0.072], [0.012, 0.072], [0.012, 0.055]], 40), brightSteel()), "assemble");
    },

    engine() {
      const m = mat("engine", { color: 0x6b7178, metalness: 0.5, roughness: 0.65, map: noiseTex("#6b7178", ["#5d636a", "#7a8087"], 2500, 2) }, { metal: true, paint: true });
      mesh(rblock(0.34, 0.22, 0.22, 0.012), m);
      mesh(box(0.36, 0.02, 0.26), m, [0, 0.01, 0]);
      mesh(merge([-0.12, -0.04, 0.04, 0.12].map((x) => [cyl(0.033, 0.033, 0.002, 28), { p: [x, 0.221, 0] }])), mat("bore", { color: 0xc9ced6, metalness: 0.9, roughness: 0.2 }));
      mesh(merge(Array.from({ length: 5 }, (_, i) => [box(0.01, 0.15, 0.006), { p: [-0.12 + i * 0.06, 0.1, 0.112] }])), m);
    },

    door() {
      const s = rrect(0.6, 0.42, 0.04);
      const win = new THREE.Path();
      win.moveTo(-0.24, 0.02); win.lineTo(0.2, 0.02); win.lineTo(0.12, 0.18); win.lineTo(-0.24, 0.18); win.lineTo(-0.24, 0.02);
      s.holes.push(win);
      const raw = mat("doorsteel", { color: 0x8e979f, metalness: 0.7, roughness: 0.35 }, { metal: true, paint: true });
      mesh(slab(s, 0.6, 0.42, 0.006, 0.002), raw, [0, 0.012, 0]);
      mesh(box(0.5, 0.004, 0.02), raw, [0, 0.02, 0.12]);
      show(mesh(merge([[box(0.6, 0.004, 0.012), { p: [0, 0.006, 0.204] }], [box(0.6, 0.004, 0.012), { p: [0, 0.006, -0.204] }], [box(0.012, 0.004, 0.42), { p: [0.294, 0.006, 0] }]]), mat("hem", { color: 0x5b6470, metalness: 0.7, roughness: 0.4 })), "process");
    },

    enclosure() {
      const m = mat("encl", { color: 0xaeb6bf, metalness: 0.6, roughness: 0.4, map: noiseTex("#aeb6bf", ["#a0a8b1", "#bcc4cc"], 1200, 2) }, { metal: true, paint: true });
      mesh(box(W, H, D), m, [0, H / 2, 0]);
      mesh(merge([[box(0.002, H - 0.02, 0.002), { p: [W / 2 - 0.01, H / 2, D / 2 + 0.001] }], [box(W - 0.02, 0.002, 0.002), { p: [0, 0.01, D / 2 + 0.001] }], [box(W - 0.02, 0.002, 0.002), { p: [0, H - 0.01, D / 2 + 0.001] }]]), mat("seamline", { color: 0x3f4650, roughness: 0.5 }));
      mesh(cyl(0.008, 0.008, 0.01, 12), blackPlastic(), [-W / 2 + 0.03, H / 2, D / 2 + 0.005], [Math.PI / 2, 0, 0]);
    },

    housing() {
      const m = castAlu();
      mesh(rblock(0.16, 0.06, 0.12, 0.01), m);
      mesh(merge([[cyl(0.024, 0.024, 0.08, 20), { p: [0.04, 0.03, 0], r: [Math.PI / 2, 0, 0] }]]), m);
      const lid = mesh(box(0.15, 0.008, 0.11), brightSteel(), [0, 0.064, 0]);
      const screws = mesh(merge([[0.065, 0.045], [-0.065, 0.045], [0.065, -0.045], [-0.065, -0.045]].map(([x, z]) => [cyl(0.005, 0.005, 0.004, 6), { p: [x, 0.07, z] }])), mat("screws", { color: 0x2b2f35, metalness: 0.8, roughness: 0.3 }));
      if (v === "screw") show(screws, "assemble");
      else if (v === "glue") show(mesh(new THREE.TorusGeometry(0.06, 0.003, 6, 40), mat("gluebead", { color: 0x1f2937, roughness: 0.4, clearcoat: 0.6 }), [0, 0.0605, 0], [Math.PI / 2, 0, 0], [1.25, 0.9, 1]), "apply");
      else if (v === "mask") {
        show(mesh(merge([[box(0.165, 0.062, 0.02), { p: [0, 0.031, 0.045] }], [cyl(0.026, 0.026, 0.082, 20), { p: [0.04, 0.03, 0], r: [Math.PI / 2, 0, 0] }]]), mat("masking", { color: 0x65a30d, roughness: 0.7 })), "apply");
      } else {
        show(lid, "assemble");
        show(screws, "assemble");
      }
    },

    solar() {
      const cells = tex(256, 160, (x, w, h) => {
        x.fillStyle = "#e8eef5";
        x.fillRect(0, 0, w, h);
        const cw = w / 10, ch = h / 6;
        for (let i = 0; i < 10; i++) for (let j = 0; j < 6; j++) {
          x.fillStyle = "#13294b";
          x.fillRect(i * cw + 1, j * ch + 1, cw - 2, ch - 2);
          x.fillStyle = "rgba(200,210,225,0.6)";
          x.fillRect(i * cw + cw * 0.33, j * ch + 1, 1, ch - 2);
          x.fillRect(i * cw + cw * 0.66, j * ch + 1, 1, ch - 2);
        }
      });
      mesh(box(0.58, 0.006, 0.34), mat("pv", { map: cells, roughness: 0.15, metalness: 0.2, clearcoat: 1 }), [0, 0.028, 0]);
      const frame = mesh(merge([[box(0.6, 0.035, 0.012), { p: [0, 0.0175, 0.174] }], [box(0.6, 0.035, 0.012), { p: [0, 0.0175, -0.174] }], [box(0.012, 0.035, 0.36), { p: [0.294, 0.0175, 0] }], [box(0.012, 0.035, 0.36), { p: [-0.294, 0.0175, 0] }]]), alu());
      if (stages.has("assemble")) show(frame, "assemble");
      mesh(box(0.08, 0.02, 0.05), blackPlastic(), [0, 0.012, -0.1]);
    },

    composite() {
      const weave = tex(64, 64, (x, w, h) => {
        x.fillStyle = "#1a1c1f";
        x.fillRect(0, 0, w, h);
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
          x.fillStyle = (i + j) % 2 ? "#2c3036" : "#15171a";
          x.fillRect(i * 8, j * 8, 8, 8);
        }
      }, { repeat: [8, 6] });
      const cf = mat("carbon", { map: weave, roughness: 0.35, clearcoat: 0.6 });
      for (let i = 0; i < 3; i++) mesh(box(0.48 - i * 0.02, 0.003, 0.33 - i * 0.02), cf, [i * 0.004, 0.0015 + i * 0.0035, 0], [0, i * 0.02, 0]);
    },

    rebar() {
      const ribs = mat("rebar", { map: tex(16, 64, (x, w, h) => {
        x.fillStyle = "#6b4a3a";
        x.fillRect(0, 0, w, h);
        for (let i = 0; i < h; i += 6) {
          x.fillStyle = "#4a3326";
          x.fillRect(0, i, w, 2);
        }
      }, { repeat: [1, 8] }), metalness: 0.6, roughness: 0.6 }, { metal: true });
      const bars = [];
      for (const z of [-0.14, -0.047, 0.047, 0.14]) bars.push([cyl(0.006, 0.006, 0.45, 10), { p: [0, 0.006, z], r: [0, 0, Math.PI / 2] }]);
      for (const x of [-0.18, -0.06, 0.06, 0.18]) bars.push([cyl(0.006, 0.006, 0.35, 10), { p: [x, 0.018, 0], r: [Math.PI / 2, 0, 0] }]);
      mesh(merge(bars), ribs);
      const ties = [];
      for (const z of [-0.14, -0.047, 0.047, 0.14]) for (const x of [-0.18, -0.06, 0.06, 0.18]) ties.push([new THREE.TorusGeometry(0.008, 0.0012, 4, 10), { p: [x, 0.012, z], r: [0, Math.PI / 4, 0] }]);
      show(mesh(merge(ties), mat("tie", { color: 0x9aa3ad, metalness: 0.8, roughness: 0.3 })), "assemble");
    },

    drywall() {
      mesh(box(W, H, D), mat("gypsum", { map: noiseTex("#eef0f0", ["#e3e6e6", "#f7f8f8"], 1200, 2), roughness: 0.95 }, { paint: true }), [0, H / 2, 0]);
      show(mesh(merge([[-0.2, -0.12], [0, -0.12], [0.2, -0.12], [-0.2, 0.12], [0, 0.12], [0.2, 0.12]].map(([x, z]) => [cyl(0.006, 0.006, 0.002, 12), { p: [x, H + 0.0005, z] }])), mat("drillhole", { color: 0x2b2f35, roughness: 0.8 })), "process");
    },

    wallpanel() {
      const bricks = tex(256, 160, (x, w, h) => {
        x.fillStyle = "#d8d2c6";
        x.fillRect(0, 0, w, h);
        for (let r = 0; r < 8; r++) for (let c = -1; c < 6; c++) {
          x.fillStyle = ["#a9472f", "#9a3f29", "#b85537"][Math.floor(R() * 3)];
          x.fillRect(c * 48 + (r % 2) * 24 + 2, r * 20 + 2, 44, 16);
        }
      });
      mesh(box(W, H, D), mat("bricks", { map: bricks, roughness: 0.95 }, { stone: true }), [0, H / 2, 0]);
      show(mesh(box(W + 0.002, 0.006, D + 0.002), mat("plaster", { map: noiseTex("#efe9df", ["#e6dfd3", "#f6f2ea"], 1500, 2), roughness: 0.9 }), [0, H + 0.003, 0]), "apply");
    },

    shoe() {
      const leather = mat("leather", { color: 0x5a3a24, roughness: 0.5, clearcoat: 0.3 }, { organic: true });
      const foot = new THREE.Shape();
      foot.moveTo(-0.13, 0);
      foot.bezierCurveTo(-0.13, 0.045, -0.06, 0.05, 0.02, 0.042);
      foot.bezierCurveTo(0.1, 0.05, 0.14, 0.03, 0.14, 0);
      foot.bezierCurveTo(0.14, -0.03, 0.1, -0.048, 0.02, -0.04);
      foot.bezierCurveTo(-0.06, -0.035, -0.13, -0.045, -0.13, 0);
      mesh(sphere(0.05, 24, 14), leather, [0, 0.05, 0], null, [2.6, 1, 0.9]);
      mesh(slab(foot, 0.28, 0.1, 0.012, 0.003), mat("sole", { color: 0xe8e2d6, roughness: 0.8 }), [0, 0.088, 0]);
      show(mesh(slab(foot, 0.28, 0.1, 0.002, 0), mat("primer", { color: 0xf0d27a, roughness: 0.1, transparent: true, opacity: 0.65, clearcoat: 1 }), [0, 0.1, 0]), "apply");
    },

    jewellery() {
      mesh(new THREE.TorusGeometry(0.03, 0.005, 16, 64), mat("gold", { color: 0xd4a017, metalness: 1, roughness: 0.32 }, { metal: true, keep: true }), [0, 0.006, 0], [Math.PI / 2, 0, 0]);
    },

    ceramic() {
      mesh(lathe([[0, 0], [0.035, 0], [0.042, 0.02], [0.05, 0.07], [0.04, 0.12], [0.024, 0.145], [0.028, 0.16], [0.024, 0.16], [0.02, 0.145], [0.034, 0.12]], 36), mat("bisque", { color: 0xe8dcc8, roughness: 0.9, side: THREE.DoubleSide }, { glaze: true }));
    },

    faucet() {
      const brass = mat("brass", { color: 0xb08d57, metalness: 0.9, roughness: 0.38 }, { metal: true, keep: true });
      mesh(cyl(0.03, 0.032, 0.012, 28), brass, [-0.045, 0.006, 0]);
      mesh(lathe([[0.022, 0], [0.022, 0.08], [0.018, 0.095], [0.012, 0.1], [0, 0.1]], 28), brass, [-0.045, 0.012, 0]);
      const spout = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.03, 0.085, 0), new THREE.Vector3(0.02, 0.108, 0), new THREE.Vector3(0.058, 0.1, 0), new THREE.Vector3(0.07, 0.07, 0)]);
      mesh(new THREE.TubeGeometry(spout, 24, 0.009, 12, false), brass);
      mesh(box(0.05, 0.008, 0.014), brass, [-0.055, 0.118, 0], [0, 0, 0.25]);
    },

    mug() {
      const m = mat("mug", { color: 0xf8f8f6, roughness: 0.2, clearcoat: 0.8, side: THREE.DoubleSide });
      mesh(lathe([[0, 0], [0.038, 0], [0.04, 0.005], [0.04, 0.095], [0.036, 0.095], [0.036, 0.008], [0, 0.008]], 32), m);
      mesh(new THREE.TorusGeometry(0.025, 0.006, 10, 20, Math.PI), m, [0.04, 0.05, 0], [0, 0, -Math.PI / 2]);
      mesh(cyl(0.0402, 0.0402, 0.04, 32, true, 0), mat("logo", { map: printTex("#ffffff", "#1d4ed8", "ROBOTVERSE", "", 256, 96), transparent: true, side: THREE.DoubleSide }), [0, 0.05, 0]);
    },

    waxtree() {
      const wax = mat("wax", { color: 0x3f8f6a, roughness: 0.45, clearcoat: 0.3 });
      const pieces = () => {
        const list = [[cyl(0.012, 0.012, 0.2, 14), { p: [0, 0.1, 0] }], [cyl(0.035, 0.02, 0.03, 20), { p: [0, 0.215, 0] }]];
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2, y = 0.04 + (i % 3) * 0.05;
          list.push([box(0.04, 0.006, 0.006), { p: [Math.cos(a) * 0.025, y, Math.sin(a) * 0.025], r: [0, -a, 0] }]);
          list.push([box(0.022, 0.03, 0.016), { p: [Math.cos(a) * 0.05, y, Math.sin(a) * 0.05], r: [0, -a, 0] }]);
        }
        return merge(list);
      };
      mesh(pieces(), wax);
      // The ceramic shell the dips build up, over the same tree.
      const shell = mat("shell", { map: noiseTex("#f1ede4", ["#e2ddd2", "#ffffff"], 1600, 2.5), roughness: 1 });
      show(mesh(pieces(), shell, [0, -0.004, 0], null, [1.18, 1.03, 1.18]), "apply");
    },

    probe() {
      mesh(cyl(0.015, 0.015, 0.3, 18), mat("cardboard", { color: 0xb9925a, roughness: 0.9 }), [-0.02, 0.015, 0], [0, 0, Math.PI / 2]);
      mesh(cyl(0.01, 0.015, 0.05, 16), steel(), [0.15, 0.015, 0], [0, 0, Math.PI / 2]);
    },

    print3d() {
      mesh(box(W, 0.006, D), mat("buildplate", { map: noiseTex("#1f2328", ["#2a2f35", "#17191c"], 1500, 1.5), roughness: 0.7 }), [0, 0.003, 0]);
      const pla = tex(16, 128, (x, w, h) => {
        x.fillStyle = "#f97316";
        x.fillRect(0, 0, w, h);
        for (let i = 0; i < h; i += 2) {
          x.fillStyle = "rgba(0,0,0,0.12)";
          x.fillRect(0, i, w, 1);
        }
      });
      mesh(lathe([[0.02, 0.006], [0.045, 0.01], [0.05, 0.04], [0.035, 0.07], [0.04, 0.085], [0.036, 0.085], [0.031, 0.07], [0.045, 0.04], [0.04, 0.012], [0.02, 0.01]], 6), mat("pla", { map: pla, roughness: 0.5, side: THREE.DoubleSide }));
    },

    plate() {
      const rust = v === "rust";
      const clean = mat("plate", { color: 0x9aa4ae, metalness: 0.7, roughness: rust ? 0.75 : 0.4, map: noiseTex("#9aa4ae", ["#8f99a3", "#a6b0ba"], 1200, 2) }, { metal: true, paint: true });
      mesh(box(W, H, D), clean, [0, H / 2, 0]);
      if (rust) {
        const r = tex(128, 128, (x, w, h) => {
          x.clearRect(0, 0, w, h);
          for (let i = 0; i < 60; i++) {
            x.fillStyle = ["rgba(140,70,30,0.75)", "rgba(110,50,20,0.7)", "rgba(170,90,40,0.6)"][Math.floor(R() * 3)];
            x.beginPath();
            x.ellipse(R() * w, R() * h, 4 + R() * 18, 3 + R() * 12, R() * 3, 0, Math.PI * 2);
            x.fill();
          }
        });
        hide(mesh(new THREE.PlaneGeometry(W, D), mat("rust", { map: r, transparent: true, roughness: 1, depthWrite: false }), [0, H + 0.0006, 0], [-Math.PI / 2, 0, 0]), "finish");
      } else {
        show(mesh(merge((v === "drill" ? [[-0.1, -0.07], [-0.03, -0.07], [0.04, -0.07], [0.11, -0.07], [-0.1, 0.07], [-0.03, 0.07], [0.04, 0.07], [0.11, 0.07]] : [[0, 0]]).map(([x, z]) => [cyl(v === "drill" ? 0.005 : 0.05, v === "drill" ? 0.005 : 0.05, 0.002, v === "drill" ? 12 : 6), { p: [x, H + 0.0006, z] }])), mat("cuthole", { color: 0x111418, roughness: 0.6 })), "process");
      }
    },

    timber() {
      const w = wood("#c79a62");
      hide(mesh(box(W, H, D), w, [0, H / 2, 0]), "process");
      show(mesh(box(W / 2 - 0.004, H, D), w, [-W / 4 - 0.004, H / 2, 0]), "process");
      show(mesh(box(W / 2 - 0.004, H, D), w, [W / 4 + 0.004, H / 2, 0]), "process");
    },

    elbow() {
      mesh(new THREE.TorusGeometry(0.06, 0.02, 14, 24, Math.PI / 2), mat("elbow", { color: 0x6b7280, metalness: 0.7, roughness: 0.45 }, { metal: true, paint: true }), [-0.035, 0.022, -0.035], [Math.PI / 2, 0, 0]);
    },

    woodframe() {
      const w = wood("#d2a670");
      mesh(merge([-0.1, 0, 0.1].map((z) => [box(0.35, 0.04, 0.04), { p: [0, 0.02, z] }])), w);
      mesh(merge([-0.14, -0.07, 0, 0.07, 0.14].map((x) => [box(0.05, 0.015, 0.25), { p: [x, 0.0475, 0] }])), w);
      show(mesh(merge([-0.14, -0.07, 0, 0.07, 0.14].flatMap((x) => [-0.1, 0, 0.1].map((z) => [cyl(0.003, 0.003, 0.001, 8), { p: [x, 0.0555, z] }]))), steel()), "assemble");
    },

    valve() {
      const brass = mat("brass", { color: 0xb08d57, metalness: 0.9, roughness: 0.3 }, { metal: true, keep: true });
      mesh(sphere(0.026, 24, 16), brass, [0, 0.03, 0]);
      mesh(merge([[cyl(0.018, 0.018, 0.1, 6), { p: [0, 0.03, 0], r: [0, 0, Math.PI / 2] }]]), brass);
      mesh(cyl(0.005, 0.005, 0.025, 10), steel(), [0, 0.065, 0]);
      mesh(box(0.07, 0.006, 0.014), mat("lever", { color: 0xdc2626, roughness: 0.4 }), [0.025, 0.078, 0]);
    },

    device() {
      mesh(rblock(W, H, D, 0.004), mat("devbody", { color: 0x2b2f35, metalness: 0.6, roughness: 0.35 }));
      mesh(box(W - 0.006, 0.0008, D - 0.008), mat("screen", { color: 0x0b1220, roughness: 0.05, metalness: 0.3, clearcoat: 1 }), [0, H + 0.0004, 0]);
    },

    pouch() {
      const t = printTex("#f59e0b", "#7c2d12", "CRISPY", "Masala · 52 g", 256, 160);
      mesh(slab(rrect(W - 0.02, D - 0.02, 0.01), W, D, H, H * 0.45), mat("pouch", { map: t, roughness: 0.3, metalness: 0.2, clearcoat: 0.6 }));
      mesh(merge([[box(W, 0.002, 0.012), { p: [0, H / 2, D / 2 - 0.004] }], [box(W, 0.002, 0.012), { p: [0, H / 2, -D / 2 + 0.004] }]]), mat("seal", { color: 0xb45309, roughness: 0.4 }));
    },

    cup() {
      mesh(lathe([[0, 0], [0.026, 0], [0.0375, 0.088], [0.039, 0.09], [0.0365, 0.09], [0.024, 0.003], [0, 0.003]], 32), mat("cup", { color: 0xf5f5f2, roughness: 0.3, transparent: true, opacity: 0.88, side: THREE.DoubleSide }));
    },
  };

  (B[key] || B.block)();

  /* ---------------- states ---------------- */
  const variants = new Map();
  const coatColor = new THREE.Color(coat || (key === "door" ? "#b91c1c" : key === "enclosure" ? "#d6d3c4" : key === "ceramic" ? "#1e5aa8" : "#2f6fd1"));
  function variantOf(m, state) {
    const f = m.userData || {};
    if (state === "raw" || f.glass || f.organic) return m;
    const id = `${f.id}:${state}`;
    if (variants.has(id)) return variants.get(id);
    let out = m;
    if (state === "machined" && f.metal && !f.keep) {
      out = m.clone();
      out.color.lerp(new THREE.Color(0xd5dde6), 0.6);
      out.metalness = 0.88;
      out.roughness = 0.24;
    } else if (state === "coated" && (f.paint || f.glaze || f.metal)) {
      out = m.clone();
      if (key === "faucet") {
        out.color.set(0xeef2f6);
        out.metalness = 1;
        out.roughness = 0.06;
      } else {
        out.color.copy(coatColor);
        out.map = null;
        out.metalness = 0.15;
        out.roughness = f.glaze ? 0.12 : 0.38;
      }
    } else if (state === "polished") {
      out = m.clone();
      if (f.metal && !f.keep) {
        out.color.lerp(new THREE.Color(0xf1f5f9), 0.7);
        out.metalness = 1;
      }
      out.roughness = Math.min(out.roughness, f.metal ? 0.06 : 0.12);
    }
    if (out !== m) {
      out.userData = { ...f, id };
      out.needsUpdate = true;
    }
    variants.set(id, out);
    return out;
  }
  function setState(part, state) {
    part.userData.state = state;
    part.traverse((o) => {
      if (!o.isMesh || !o.userData.mat) return;
      const base = mats.get(o.userData.mat);
      if (base) o.material = variantOf(base, state);
    });
  }
  /** Show what a step adds and hide what it removes. Returns true when the product has anything for it. */
  function reveal(part, stage) {
    let hit = false;
    part.traverse((o) => {
      if (o.userData.showOn === stage) {
        o.visible = true;
        hit = true;
      } else if (o.userData.hideOn === stage) {
        o.visible = false;
        hit = true;
      }
    });
    return hit;
  }
  const hasStage = (stage) => {
    let hit = false;
    root.traverse((o) => (hit = hit || o.userData.showOn === stage || o.userData.hideOn === stage));
    return hit;
  };
  // A new piece shows only what is already done: steps the line performs start undone.
  root.traverse((o) => {
    if (o.userData.showOn) o.visible = !stages.has(o.userData.showOn);
    if (o.userData.hideOn) o.visible = stages.has(o.userData.hideOn);
  });

  function spawn() {
    const p = root.clone();
    p.userData = { state: "raw", product: key };
    return p;
  }

  /* ---------------- containers ---------------- */
  const crateM = mat("crate", { color: key === "produce" || key === "bottle" ? 0x1f7a3a : 0x1f5fb8, roughness: 0.55 });
  const trayM = mat("ctray", { color: key === "egg" ? 0xb9a58a : key === "seedling" ? 0x1d1f22 : 0xe5e7eb, roughness: key === "egg" ? 1 : 0.5 });
  /** An open crate (or tray) of inner size iw × id, wall height h. */
  function crate(iw, id, h, m = crateM, slots = true) {
    const grp = new THREE.Group();
    const t = 0.008;
    const geo = merge([
      [box(iw + 2 * t, t, id + 2 * t), { p: [0, t / 2, 0] }],
      [box(iw + 2 * t, h, t), { p: [0, h / 2, id / 2 + t / 2] }],
      [box(iw + 2 * t, h, t), { p: [0, h / 2, -id / 2 - t / 2] }],
      [box(t, h, id), { p: [iw / 2 + t / 2, h / 2, 0] }],
      [box(t, h, id), { p: [-iw / 2 - t / 2, h / 2, 0] }],
    ]);
    const o = new THREE.Mesh(g(geo), m);
    o.castShadow = o.receiveShadow = true;
    grp.add(o);
    if (slots && m === crateM) {
      const holes = new THREE.Mesh(g(merge(Array.from({ length: 6 }, (_, i) => [box(0.04, 0.012, 0.002), { p: [-iw / 2 + iw * ((i + 0.5) / 6), h * 0.6, id / 2 + t + 0.0005] }]))), mat("crateslot", { color: 0x0f3d1f, roughness: 0.8 }));
      grp.add(holes);
    }
    return grp;
  }
  /** A container of the product, for the supply next to the infeed: { group, size:[w,h,d] }. */
  function container(kind, fill = true) {
    const grp = new THREE.Group();
    const add = (o, x, y, z, r = 0) => {
      o.position.set(x, y, z);
      o.rotation.y = r;
      grp.add(o);
    };
    if (kind === "crate" || kind === "tray") {
      const tray = kind === "tray";
      const cols = Math.max(1, Math.min(tray ? 6 : 5, Math.floor(0.52 / (W + 0.01))));
      const rows = Math.max(1, Math.min(tray ? 4 : 4, Math.floor(0.36 / (D + 0.01))));
      const iw = cols * (W + 0.01), id = rows * (D + 0.01);
      const h = tray ? Math.min(0.03, H * 0.4) + 0.006 : Math.max(0.12, H * 1.2);
      add(crate(iw, id, h, tray ? trayM : crateM), 0, 0, 0);
      if (fill) {
        for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
          const p = spawn();
          setState(p, "raw");
          add(p, -iw / 2 + (i + 0.5) * (W + 0.01), 0.008 + H / 2, -id / 2 + (j + 0.5) * (D + 0.01), (i + j) % 2 ? 0.4 : 0);
        }
      }
      return { group: grp, size: [iw + 0.016, h, id + 0.016] };
    }
    if (kind === "bin") {
      const iw = 0.5, id = 0.38, h = 0.32;
      add(crate(iw, id, h, mat("wirebin", { color: 0x6b7280, metalness: 0.6, roughness: 0.45 }), false), 0, 0, 0);
      if (fill) for (let i = 0; i < 9; i++) {
        const p = spawn();
        p.rotation.set(R() * 3, R() * 3, R() * 3);
        p.scale.setScalar(0.92);
        add(p, (R() - 0.5) * (iw - W), 0.18 + R() * 0.06, (R() - 0.5) * (id - D));
        p.rotation.set(R() * 3, R() * 3, R() * 3);
      }
      return { group: grp, size: [iw, h, id] };
    }
    if (kind === "rack") {
      const rm = mat("rackframe", { color: 0xb8c0c8, metalness: 0.7, roughness: 0.35 });
      const levels = 4, pitch = Math.max(0.12, H + 0.05), rw = Math.max(0.42, W + 0.08), rd = Math.max(0.36, D + 0.06);
      const parts = [];
      for (const x of [-rw / 2, rw / 2]) for (const z of [-rd / 2, rd / 2]) parts.push([box(0.02, levels * pitch + 0.1, 0.02), { p: [x, (levels * pitch + 0.1) / 2, z] }]);
      for (let l = 0; l < levels; l++) parts.push([box(rw, 0.008, rd), { p: [0, 0.1 + l * pitch, 0] }]);
      const o = new THREE.Mesh(g(merge(parts)), rm);
      o.castShadow = o.receiveShadow = true;
      grp.add(o);
      if (fill) for (let l = 0; l < levels; l++) add(spawn(), 0, 0.104 + l * pitch + H / 2, 0);
      return { group: grp, size: [rw, levels * pitch + 0.1, rd] };
    }
    // Pallet with a stacked load.
    const pw = 1.0, pd = 0.8;
    const pal = new THREE.Mesh(g(merge([
      ...[-0.4, -0.2, 0, 0.2, 0.4].map((x) => [box(0.12, 0.022, pd), { p: [x, 0.133, 0] }]),
      ...[-0.35, 0, 0.35].map((z) => [box(pw, 0.11, 0.1), { p: [0, 0.067, z] }]),
      ...[-0.42, 0, 0.42].map((x) => [box(0.1, 0.022, pd), { p: [x, 0.011, 0] }]),
    ])), wood("#b9905e"));
    pal.castShadow = pal.receiveShadow = true;
    grp.add(pal);
    if (fill) {
      const cols = Math.max(1, Math.min(4, Math.floor(pw / (W + 0.01))));
      const rows = Math.max(1, Math.min(4, Math.floor(pd / (D + 0.01))));
      const layers = Math.max(1, Math.min(4, Math.floor(0.5 / H)));
      for (let l = 0; l < layers; l++) for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        add(spawn(), -((cols - 1) * (W + 0.01)) / 2 + i * (W + 0.01), 0.144 + H / 2 + l * H, -((rows - 1) * (D + 0.01)) / 2 + j * (D + 0.01));
      }
    }
    return { group: grp, size: [pw, 0.144 + Math.min(0.5, H * 4), pd] };
  }

  /* ---------------- scenery: where the job happens ---------------- */
  const sceneMesh = (geo, m, p, r, sc, parent) => {
    const o = new THREE.Mesh(g(geo), m);
    if (p) o.position.set(p[0], p[1], p[2]);
    if (r) o.rotation.set(r[0], r[1], r[2]);
    if (sc) o.scale.set(sc[0], sc[1], sc[2]);
    o.castShadow = o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  /**
   * The job's surroundings behind the line: plant rows for harvesting, a greenhouse bench, a solar array, a
   * container being unloaded, a car at the charger, a cow at the milking stall, a furnace for hot work. Null when
   * the job happens on an ordinary factory floor.
   */
  function scenery(jobs) {
    const t = lower((jobs || []).join(" | "));
    const grp = new THREE.Group();
    const foliage = mat("foliage", { map: noiseTex("#3f7d2a", ["#2f6b22", "#4f9a35", "#2a5a1d"], 2000, 3), roughness: 0.8 }, { organic: true });
    if (/fruit|vegetable|harvest/.test(t)) {
      const soil = mat("bed", { map: noiseTex("#5a4030", ["#4a3324", "#6b4c38"], 2500, 2.5), roughness: 1 });
      for (let i = 0; i < 4; i++) {
        const x = -1.8 + i * 1.2;
        sceneMesh(box(0.9, 0.12, 0.5), soil, [x, 0.06, 0], null, null, grp);
        sceneMesh(new THREE.CylinderGeometry(0.03, 0.045, 0.9, 8), mat("trunk", { color: 0x5b4228, roughness: 0.9 }), [x, 0.55, 0], null, null, grp);
        const blobs = [];
        for (let k = 0; k < 7; k++) blobs.push([new THREE.SphereGeometry(0.22, 12, 10), { p: [Math.cos(k * 1.7) * 0.2, 1.0 + (k % 3) * 0.14, Math.sin(k * 1.7) * 0.16] }]);
        sceneMesh(merge(blobs), foliage, [x, 0, 0], null, null, grp);
        for (let k = 0; k < 7; k++) {
          const f = spawn();
          f.position.set(x + Math.cos(k * 2.3) * 0.33, 0.85 + (k % 4) * 0.12, Math.sin(k * 2.3) * 0.27);
          grp.add(f);
        }
      }
      return { group: grp, width: 4.6 };
    }
    if (/greenhouse|seeding|transplant/.test(t)) {
      const frame = mat("ghframe", { color: 0xd9dee3, metalness: 0.6, roughness: 0.35 });
      sceneMesh(box(3.2, 0.04, 0.9), mat("bench", { color: 0x9aa3ad, metalness: 0.5, roughness: 0.45 }), [0, 0.8, 0], null, null, grp);
      for (const x of [-1.5, 1.5]) for (const z of [-0.4, 0.4]) sceneMesh(box(0.04, 0.8, 0.04), frame, [x, 0.4, z], null, null, grp);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) {
        const p = spawn();
        p.position.set(-1.35 + i * 0.5, 0.82 + H / 2, -0.2 + j * 0.4);
        grp.add(p);
      }
      for (const x of [-1.6, 1.6]) sceneMesh(box(0.05, 2.4, 0.05), frame, [x, 1.2, -0.6], null, null, grp);
      sceneMesh(box(3.3, 0.05, 0.05), frame, [0, 2.4, -0.6], null, null, grp);
      sceneMesh(new THREE.PlaneGeometry(3.2, 2.35), mat("ghglass", { color: 0xdff3f0, transparent: true, opacity: 0.18, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }), [0, 1.2, -0.62], null, null, grp);
      return { group: grp, width: 3.4 };
    }
    if (/solar/.test(t)) {
      for (let i = 0; i < 3; i++) {
        const x = -1.3 + i * 1.3;
        const panel = spawn();
        panel.scale.setScalar(1.9);
        panel.position.set(x, 0.75, 0);
        panel.rotation.x = -0.45;
        grp.add(panel);
        sceneMesh(box(0.05, 0.75, 0.05), mat("post", { color: 0x9aa3ad, metalness: 0.6, roughness: 0.4 }), [x, 0.37, 0.15], null, null, grp);
      }
      return { group: grp, width: 4 };
    }
    if (/truck|container unloading/.test(t)) {
      const steelBox = mat("container", { map: tex(64, 256, (x, w, hh) => {
        x.fillStyle = "#1f5fb8";
        x.fillRect(0, 0, w, hh);
        for (let i = 0; i < hh; i += 12) {
          x.fillStyle = "rgba(0,0,0,0.18)";
          x.fillRect(0, i, w, 5);
        }
      }, { repeat: [1, 6] }), metalness: 0.5, roughness: 0.55, side: THREE.DoubleSide });
      const L = 3.6, Wd = 1.5, Hh = 1.6;
      sceneMesh(box(L, 0.05, Wd), steelBox, [0, 0.45, 0], null, null, grp);
      sceneMesh(box(L, Hh, 0.04), steelBox, [0, 0.45 + Hh / 2, -Wd / 2], null, null, grp);
      // The near side is cut away so the load inside shows.
      sceneMesh(box(L, 0.04, Wd), steelBox, [0, 0.45 + Hh, 0], null, null, grp);
      sceneMesh(box(0.04, Hh, Wd), steelBox, [-L / 2, 0.45 + Hh / 2, 0], null, null, grp);
      for (const x of [-1.2, 1.2]) for (const z of [-0.6, 0.6]) sceneMesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 18), mat("truckwheel", { color: 0x15181c, roughness: 0.9 }), [x, 0.22, z], [Math.PI / 2, 0, 0], null, grp);
      // The back of the container is still full; the robot unloads from the open end.
      const cols = Math.min(4, Math.floor((L - 0.8) / (W + 0.02))), rows = Math.min(3, Math.floor((Wd - 0.1) / (D + 0.02))), lay = Math.max(1, Math.min(2, Math.floor((Hh - 0.1) / H)));
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) for (let l = 0; l < lay; l++) {
        const c = spawn();
        c.position.set(-L / 2 + 0.1 + W / 2 + i * (W + 0.02), 0.475 + H / 2 + l * H, -Wd / 2 + 0.08 + D / 2 + j * (D + 0.02));
        grp.add(c);
      }
      return { group: grp, width: 3.8 };
    }
    if (/ev charging|charging/.test(t)) {
      const paint = mat("carpaint", { color: 0xb91c1c, metalness: 0.4, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
      sceneMesh(rblock(3.9, 0.55, 1.75, 0.18), paint, [0, 0.25, 0], null, null, grp);
      sceneMesh(rblock(2.1, 0.5, 1.5, 0.2), paint, [-0.2, 0.78, 0], null, null, grp);
      sceneMesh(rblock(2.0, 0.42, 1.52, 0.18), mat("carglass", { color: 0x1d2a38, metalness: 0.3, roughness: 0.08, clearcoat: 1 }), [-0.2, 0.82, 0], null, [1, 1, 1], grp);
      for (const x of [-1.25, 1.25]) for (const z of [-0.82, 0.82]) {
        sceneMesh(new THREE.TorusGeometry(0.26, 0.11, 12, 24), mat("cartyre", { color: 0x15181c, roughness: 0.9 }), [x, 0.36, z], null, null, grp);
        sceneMesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 18), mat("carrim", { color: 0xc9ced6, metalness: 0.85, roughness: 0.25 }), [x, 0.36, z], [Math.PI / 2, 0, 0], null, grp);
      }
      sceneMesh(box(0.12, 0.12, 0.02), blackPlastic(), [1.6, 0.75, 0.88], null, null, grp);
      return { group: grp, width: 4.2 };
    }
    if (/milking/.test(t)) {
      const hide = mat("cowhide", { map: tex(256, 128, (x, w, hh) => {
        x.fillStyle = "#f5f3ee";
        x.fillRect(0, 0, w, hh);
        x.fillStyle = "#1c1c1c";
        for (let i = 0; i < 9; i++) {
          x.beginPath();
          x.ellipse(R() * w, R() * hh, 14 + R() * 26, 10 + R() * 18, R() * 3, 0, Math.PI * 2);
          x.fill();
        }
      }), roughness: 0.85 }, { organic: true });
      sceneMesh(new THREE.CapsuleGeometry(0.38, 1.0, 8, 16), hide, [0, 0.95, 0], [0, 0, Math.PI / 2], [1, 1, 0.9], grp);
      sceneMesh(rblock(0.36, 0.3, 0.26, 0.08), hide, [0.95, 1.12, 0], null, null, grp);
      sceneMesh(sphere(0.12, 14, 10), mat("muzzle", { color: 0xd9a3a3, roughness: 0.7 }, { organic: true }), [1.15, 1.08, 0], null, [1, 0.8, 1.1], grp);
      for (const x of [-0.5, 0.5]) for (const z of [-0.18, 0.18]) sceneMesh(new THREE.CylinderGeometry(0.06, 0.05, 0.7, 10), hide, [x, 0.35, z], null, null, grp);
      sceneMesh(sphere(0.13, 14, 10), mat("udder", { color: 0xf0b8b8, roughness: 0.6 }, { organic: true }), [-0.15, 0.58, 0], null, [1, 0.7, 1], grp);
      const rail = mat("stall", { color: 0xc9ced6, metalness: 0.8, roughness: 0.3 });
      for (const z of [-0.6, 0.6]) sceneMesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 10), rail, [0, 0.9, z], [0, 0, Math.PI / 2], null, grp);
      return { group: grp, width: 2.8 };
    }
    if (/forging|ladling|molten|harden|heat treat|die cast|steel plant/.test(t)) {
      sceneMesh(box(1.4, 1.5, 1.0), mat("furnace", { color: 0x4b5563, metalness: 0.4, roughness: 0.6 }), [0, 0.75, 0], null, null, grp);
      sceneMesh(box(0.7, 0.5, 0.02), mat("glow", { color: 0xff7a1a, emissive: 0xff4500, emissiveIntensity: 2 }), [0, 0.75, 0.51], null, null, grp);
      sceneMesh(new THREE.CylinderGeometry(0.15, 0.15, 1.2, 14), mat("flue", { color: 0x6b7280, metalness: 0.5, roughness: 0.5 }), [0.4, 2.1, -0.2], null, null, grp);
      return { group: grp, width: 1.6 };
    }
    return null;
  }

  return {
    info,
    pick,
    template: root,
    scenery,
    spawn,
    setState,
    reveal,
    hasStage,
    container,
    crate,
    trayMaterial: trayM,
    crateMaterial: crateM,
    /** Colour of the liquid a filling step pours. */
    liquid: key === "bottle" ? (BOTTLES[v] || BOTTLES.water).liquid : key === "jar" ? "#8b1020" : key === "vial" ? "#d9ecff" : key === "can" ? "#3b1d14" : "#38bdf8",
    coatColor,
    dispose() {
      geos.forEach((x) => x.dispose());
      mats.forEach((m) => m.dispose());
      variants.forEach((m) => m.dispose());
      texs.forEach((t) => t.dispose());
    },
  };
}
