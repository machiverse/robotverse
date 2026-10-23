import { useState } from "react";
import { ArrowDown, ArrowUp, Play, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Common robot jobs, named exactly like the studio's process templates. */
export const BLOCKS: { name: string; label: string; group: string }[] = [
  { name: "Loading & Unloading", label: "Pick & place / load", group: "Handling" },
  { name: "Bin Picking", label: "Bin picking", group: "Handling" },
  { name: "Material Transport", label: "Transfer / transport", group: "Handling" },
  { name: "Depalletizing", label: "Depalletizing", group: "Handling" },
  { name: "Kitting & Sequencing", label: "Kitting", group: "Handling" },
  { name: "Mobile Manipulator Machine Tending", label: "Mobile robot tending", group: "Handling" },
  { name: "Order Picking", label: "Order picking", group: "Handling" },
  { name: "Sorting & Classification", label: "Sorting", group: "Handling" },
  { name: "Glass Handling", label: "Glass / panel handling", group: "Handling" },
  { name: "Tyre Handling & Loading", label: "Tyre / wheel handling", group: "Handling" },
  { name: "Coil & Roll Handling", label: "Coil / roll handling", group: "Handling" },
  { name: "Food Handling & Tray Loading", label: "Food pick & place", group: "Handling" },
  { name: "Truck & Container Unloading", label: "Truck unloading", group: "Handling" },
  { name: "Stone Slab Handling", label: "Granite / stone slabs", group: "Handling" },
  { name: "Textile Bobbin & Cone Handling", label: "Yarn bobbins / cones", group: "Handling" },
  { name: "Injection Moulding Tending", label: "Moulding machine tending", group: "Machine tending" },
  { name: "CNC Machining", label: "CNC machine tending", group: "Machine tending" },
  { name: "CNC Turning", label: "CNC lathe tending", group: "Machine tending" },
  { name: "Compression Moulding Tending", label: "Rubber / compression moulding", group: "Machine tending" },
  { name: "Blow Moulding Trimming & Handling", label: "Blow moulding", group: "Machine tending" },
  { name: "Press Tending & Stamping", label: "Press tending", group: "Machine tending" },
  { name: "Die Casting Extraction", label: "Die casting extraction", group: "Machine tending" },
  { name: "Press Brake Bending", label: "Press brake bending", group: "Machine tending" },
  { name: "Forging Handling", label: "Forging press tending", group: "Machine tending" },
  { name: "Sheet Loading & Nested Part Sorting", label: "Laser / punch sheet loading", group: "Machine tending" },
  { name: "MIG/MAG Welding", label: "MIG/MAG welding", group: "Welding" },
  { name: "TIG Welding", label: "TIG welding", group: "Welding" },
  { name: "Spot Welding", label: "Spot welding", group: "Welding" },
  { name: "Laser Welding", label: "Laser welding", group: "Welding" },
  { name: "Ultrasonic Plastic Welding", label: "Ultrasonic plastic welding", group: "Welding" },
  { name: "Stud Welding", label: "Stud welding", group: "Welding" },
  { name: "Pipe & Orbital Welding", label: "Pipe welding", group: "Welding" },
  { name: "Grinding & Surface Prep", label: "Grinding", group: "Finishing" },
  { name: "Polishing", label: "Polishing", group: "Finishing" },
  { name: "Foundry Fettling & Grinding", label: "Foundry fettling", group: "Finishing" },
  { name: "Stone & Granite Edge Polishing", label: "Granite edge polishing", group: "Finishing" },
  { name: "Deflashing & Surface Finishing", label: "Deflashing / deburring", group: "Finishing" },
  { name: "Painting & Coating", label: "Painting / coating", group: "Finishing" },
  { name: "Powder Coating", label: "Powder coating", group: "Finishing" },
  { name: "Adhesive & Sealant Dispensing", label: "Glue / sealant dispensing", group: "Finishing" },
  { name: "Potting, Gap Filler & Conformal Coating", label: "Potting / conformal coating", group: "Finishing" },
  { name: "Laser Cleaning & Surface Prep", label: "Laser cleaning", group: "Finishing" },
  { name: "Assembly", label: "Assembly", group: "Assembly" },
  { name: "Screw Driving", label: "Screw driving", group: "Assembly" },
  { name: "Riveting Assembly", label: "Riveting", group: "Assembly" },
  { name: "Wire Harness Assembly", label: "Wire harness", group: "Assembly" },
  { name: "Battery Module Assembly", label: "EV battery module", group: "Assembly" },
  { name: "Bearing Insertion Assembly", label: "Bearing / press-fit insertion", group: "Assembly" },
  { name: "Quality Inspection", label: "Quality inspection", group: "Quality" },
  { name: "Vision Inspection", label: "Vision inspection", group: "Quality" },
  { name: "Dimensional Measurement & Gauging", label: "Measuring / gauging", group: "Quality" },
  { name: "Leak Testing", label: "Leak testing", group: "Quality" },
  { name: "Testing & Validation", label: "Function testing", group: "Quality" },
  { name: "Laser Marking & Coding", label: "Laser marking / coding", group: "Quality" },
  { name: "Barcode Scanning & Verification", label: "Barcode scanning", group: "Quality" },
  { name: "Filling", label: "Filling", group: "Packing" },
  { name: "Capping", label: "Capping", group: "Packing" },
  { name: "Labeling & Weighing", label: "Labeling", group: "Packing" },
  { name: "Packing & Box Forming", label: "Packing in boxes", group: "Packing" },
  { name: "Wrapping & Packing", label: "Wrapping", group: "Packing" },
  { name: "Palletizing", label: "Palletizing", group: "Packing" },
  { name: "Cartoning (Product into Cartons)", label: "Cartoning", group: "Packing" },
  { name: "Bag & Sack Palletizing", label: "Bag / sack palletizing", group: "Packing" },
  { name: "Brick & Block Stacking", label: "Brick / block stacking", group: "Packing" },
  { name: "Bag Placing on Rotary Packers", label: "Cement bag placing", group: "Packing" },
  // The rest of the skills library, so every skill can be built cell by cell.
  { name: "Heavy Lifting & Positioning", label: "Heavy lifting", group: "Handling" },
  { name: "Crate & Tote Handling", label: "Crate / tote handling", group: "Handling" },
  { name: "Parcel Induction & Singulation", label: "Parcel singulation", group: "Handling" },
  { name: "Shipping & Dispatch", label: "Shipping / dispatch", group: "Handling" },
  { name: "ASRS & Goods-to-Person Picking", label: "Goods-to-person picking", group: "Handling" },
  { name: "Textile & Garment Handling", label: "Fabric / garment handling", group: "Handling" },
  { name: "Cotton & Jute Bale Handling", label: "Cotton / jute bales", group: "Handling" },
  { name: "Recycling & Waste Sorting", label: "Waste sorting", group: "Handling" },
  { name: "Diamond & Gemstone Sorting", label: "Diamond / gem sorting", group: "Handling" },
  { name: "Bag Opening & Emptying", label: "Bag emptying", group: "Handling" },
  { name: "CNC Milling", label: "CNC milling tending", group: "Machine tending" },
  { name: "Tube & Pipe Bending", label: "Tube / pipe bending", group: "Machine tending" },
  { name: "Furniture Panel Handling & Edge Banding", label: "Panels / edge banding", group: "Machine tending" },
  { name: "3D Printer Farm Tending", label: "3D printer farm", group: "Machine tending" },
  { name: "Drilling", label: "Robotic drilling", group: "Cutting & forming" },
  { name: "Cutting & Sawing", label: "Cutting / sawing", group: "Cutting & forming" },
  { name: "Plasma & Laser Cutting", label: "Plasma / laser cutting", group: "Cutting & forming" },
  { name: "Waterjet Cutting", label: "Waterjet cutting", group: "Cutting & forming" },
  { name: "CNC Routing & Trimming", label: "Routing / trimming", group: "Cutting & forming" },
  { name: "Roller Hemming", label: "Roller hemming", group: "Cutting & forming" },
  { name: "Robotic Welding", label: "Welding (any process)", group: "Welding" },
  { name: "Friction Stir Welding", label: "Friction stir welding", group: "Welding" },
  { name: "Heavy Fabrication & Gantry Welding", label: "Heavy fabrication welding", group: "Welding" },
  { name: "Wire Arc Additive Manufacturing (Weld Build-up)", label: "Metal 3D printing (WAAM)", group: "Welding" },
  { name: "Part Cleaning & Surface Prep", label: "Part washing / cleaning", group: "Finishing" },
  { name: "Shot Blasting & Surface Prep", label: "Shot blasting", group: "Finishing" },
  { name: "Jewellery Polishing & Finishing", label: "Jewellery polishing", group: "Finishing" },
  { name: "Spray Coating", label: "Spray coating", group: "Finishing" },
  { name: "Glaze Spraying (Ceramics)", label: "Ceramic glaze spraying", group: "Finishing" },
  { name: "Thermal Spray & Cladding", label: "Thermal spray / cladding", group: "Finishing" },
  { name: "Surface Masking & Demasking", label: "Masking / demasking", group: "Finishing" },
  { name: "Plating & Dip Coating Line", label: "Plating / dip coating", group: "Finishing" },
  { name: "Footwear Sole Adhesive Application", label: "Shoe sole gluing", group: "Finishing" },
  { name: "Screen & Pad Printing", label: "Screen / pad printing", group: "Finishing" },
  { name: "Solar Module Assembly", label: "Solar module assembly", group: "Assembly" },
  { name: "Stator Winding & Hairpin Assembly", label: "Stator / hairpin", group: "Assembly" },
  { name: "Transformer Core Lamination Laying", label: "Transformer core laying", group: "Assembly" },
  { name: "Windshield Urethane Glazing & Fitting", label: "Windshield fitting", group: "Assembly" },
  { name: "Composite Ply Layup & Fibre Placement", label: "Composite layup", group: "Assembly" },
  { name: "Nailing & Stapling", label: "Nailing / stapling", group: "Assembly" },
  { name: "Disassembly & Remanufacturing", label: "Disassembly / reman", group: "Assembly" },
  { name: "X-Ray & CT Inspection", label: "X-ray / CT inspection", group: "Quality" },
  { name: "NDT Inspection (Ultrasonic & Eddy Current)", label: "NDT (ultrasonic / eddy)", group: "Quality" },
  { name: "Box Forming & Sizing", label: "Box forming", group: "Packing" },
  { name: "Stacking", label: "Stacking", group: "Packing" },
  { name: "Sealing", label: "Sealing", group: "Packing" },
  { name: "Bottling", label: "Bottle handling", group: "Packing" },
  { name: "Strapping & Bundle Packing", label: "Strapping / bundling", group: "Packing" },
  { name: "Pouch & Sachet Pick-and-Place", label: "Pouch / sachet picking", group: "Packing" },
  { name: "Tray & Cup Denesting", label: "Tray / cup denesting", group: "Packing" },
  { name: "Ceramic Tile Sorting & Packing", label: "Ceramic tile sorting", group: "Packing" },
  { name: "Investment Shell Building (Wax Tree Dipping)", label: "Investment shell dipping", group: "Foundry & metals" },
  { name: "Molten Metal Ladling & Pouring", label: "Ladling / pouring", group: "Foundry & metals" },
  { name: "Sand Core Handling & Setting", label: "Sand core setting", group: "Foundry & metals" },
  { name: "Induction Hardening & Heat Treatment", label: "Hardening / heat treatment", group: "Foundry & metals" },
  { name: "Extrusion Line Handling", label: "Extrusion profiles", group: "Foundry & metals" },
  { name: "Steel Plant Sampling & Temperature Probing", label: "Steel sampling / probing", group: "Foundry & metals" },
  { name: "SMT Reel & Magazine Handling", label: "SMT reels / magazines", group: "Electronics & lab" },
  { name: "PCB Depaneling & Handling", label: "PCB depaneling", group: "Electronics & lab" },
  { name: "Soldering", label: "Soldering", group: "Electronics & lab" },
  { name: "THT Component Insertion Assembly", label: "THT insertion", group: "Electronics & lab" },
  { name: "Wire Crimping & Terminal Assembly", label: "Wire crimping", group: "Electronics & lab" },
  { name: "Control Cabinet Wiring Assembly", label: "Panel wiring", group: "Electronics & lab" },
  { name: "Battery Cell Testing & Grading", label: "Battery cell grading", group: "Electronics & lab" },
  { name: "Semiconductor Wafer Handling", label: "Wafer handling", group: "Electronics & lab" },
  { name: "Lab Sample Pipetting & Dosing", label: "Lab pipetting", group: "Electronics & lab" },
  { name: "Pathology Sample Tube Sorting", label: "Sample tube sorting", group: "Electronics & lab" },
  { name: "Meat Cutting & Deboning", label: "Meat cutting / deboning", group: "Food & pharma" },
  { name: "Food Portioning & Slicing", label: "Food portioning / slicing", group: "Food & pharma" },
  { name: "Bakery Pan & Tray Handling", label: "Bakery pans / trays", group: "Food & pharma" },
  { name: "Icing & Topping Dispensing", label: "Icing / topping", group: "Food & pharma" },
  { name: "Robotic Kitchen & Food Preparation", label: "Robotic kitchen", group: "Food & pharma" },
  { name: "Egg Collection, Grading & Tray Loading", label: "Egg grading / trays", group: "Food & pharma" },
  { name: "Tray Sealing", label: "Tray sealing", group: "Food & pharma" },
  { name: "Aseptic Vial Handling", label: "Aseptic vial handling", group: "Food & pharma" },
  { name: "Blister & Pharma Pack Loading", label: "Blister / pharma packs", group: "Food & pharma" },
  { name: "Pharmacy & Hospital Order Picking", label: "Pharmacy picking", group: "Food & pharma" },
  { name: "Construction 3D Concrete Printing", label: "Concrete 3D printing", group: "Construction & farm" },
  { name: "Rebar Tying & Mesh Assembly", label: "Rebar tying", group: "Construction & farm" },
  { name: "Ceiling Drilling & Drywall Fixing", label: "Ceiling drilling", group: "Construction & farm" },
  { name: "Wall Plastering & Spray Painting", label: "Wall plastering / painting", group: "Construction & farm" },
  { name: "Solar Panel Cleaning", label: "Solar panel cleaning", group: "Construction & farm" },
  { name: "Fruit & Vegetable Picking", label: "Fruit / vegetable picking", group: "Construction & farm" },
  { name: "Greenhouse Seeding & Transplanting", label: "Seeding / transplanting", group: "Construction & farm" },
  { name: "Robotic Milking", label: "Robotic milking", group: "Construction & farm" },
  { name: "Automatic EV Charging", label: "EV charging robot", group: "Construction & farm" },
];
const GROUPS = [...new Set(BLOCKS.map((b) => b.group))];

/** Jobs whose label, name or group has a word starting with each search word ("tile" finds tiles, not textiles). */
export function findJobs(query: string) {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (!words.length) return BLOCKS;
  return BLOCKS.filter((b) => {
    const text = ` ${b.label} ${b.name} ${b.group}`.toLowerCase().replace(/[^a-z0-9]+/g, " ");
    return words.every((w) => text.includes(` ${w}`));
  });
}
const MAX = 8;

/**
 * Point-and-click line builder: tap the jobs in order, reorder them, and build the robot cell.
 * Each block is a studio process template, so the plan, robots and 3D follow exactly.
 */
export default function ProcessBuilder({ onBuild }: { onBuild: (names: string[]) => void }) {
  const [line, setLine] = useState<string[]>([]);
  const [find, setFind] = useState("");
  const shown = findJobs(find);
  const label = (n: string) => BLOCKS.find((b) => b.name === n)?.label ?? n;
  const add = (n: string) => setLine((l) => (l.length >= MAX ? l : [...l, n]));
  const move = (i: number, d: -1 | 1) =>
    setLine((l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      const next = [...l];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">1. Tap the jobs in the order they happen</p>
        <label className="relative mb-1.5 block">
          <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={find}
            onChange={(e) => setFind(e.target.value)}
            placeholder={`Find a job (${BLOCKS.length})…`}
            aria-label="Find a job"
            className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-base sm:text-xs"
          />
        </label>
        {shown.length === 0 && <p className="text-[11px] text-muted-foreground">No job matches “{find}”.</p>}
        {/* 151 jobs: a scrolling list, so the line below stays in view (search narrows it). */}
        <div className="max-h-72 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
          {GROUPS.filter((g) => shown.some((b) => b.group === g)).map((g) => (
            <div key={g}>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{g}</p>
              <div className="mt-0.5 flex flex-wrap gap-1">
                {shown.filter((b) => b.group === g).map((b) => (
                  <button
                    key={b.name}
                    type="button"
                    onClick={() => add(b.name)}
                    disabled={line.length >= MAX}
                    className="inline-flex items-center gap-0.5 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" aria-hidden /> {b.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
          2. Your process ({line.length}/{MAX})
        </p>
        {line.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            No jobs yet — tap a job above to add it.
          </p>
        ) : (
          <ol className="space-y-1">
            {line.map((n, i) => (
              <li key={`${n}-${i}`} className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs">
                <span className="w-4 font-mono text-[10px] text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{label(n)}</span>
                <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-0.5 hover:bg-muted disabled:opacity-30">
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button type="button" aria-label="Move down" disabled={i === line.length - 1} onClick={() => move(i, 1)} className="rounded p-0.5 hover:bg-muted disabled:opacity-30">
                  <ArrowDown className="h-3 w-3" />
                </button>
                <button type="button" aria-label={`Remove ${label(n)}`} onClick={() => setLine((l) => l.filter((_, k) => k !== i))} className={cn("rounded p-0.5 hover:bg-muted hover:text-red-600")}>
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>

      <Button className="w-full" disabled={!line.length} onClick={() => onBuild(line)}>
        <Play className="mr-2 h-4 w-4" /> 3. Build simulation
      </Button>
      <p className="text-[11px] text-muted-foreground">Then choose the robot and tool for each job in the robot list — they appear in the 3D cell.</p>
    </div>
  );
}
