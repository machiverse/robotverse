import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface BulkRobotUploadProps {
  onSuccess?: () => void;
}

type ParsedRow = Record<string, any>;

interface ValidatedRow {
  rowNumber: number;
  data: any;
  errors: string[];
}

const TEMPLATE_COLUMNS = [
  "name",
  "brand",
  "model",
  "robot_type",
  "condition",
  "price",
  "currency",
  "quantity",
  "location",
  "state",
  "pincode",
  "year_manufactured",
  "payload_capacity",
  "reach",
  "repeatability",
  "power_consumption",
  "controller_type",
  "operating_environment",
  "warranty_info",
  "applications",
  "category_tags",
  "certification_standards",
  "included_accessories",
  "description",
  "image_urls",
];

const SAMPLE_ROW: ParsedRow = {
  name: "FANUC R-2000iC/165F Welding Robot",
  brand: "FANUC",
  model: "R-2000iC/165F",
  robot_type: "Articulated Robot",
  condition: "used",
  price: 1250000,
  currency: "INR",
  quantity: 1,
  location: "Chennai",
  state: "Tamil Nadu",
  pincode: "600032",
  year_manufactured: 2019,
  payload_capacity: 165,
  reach: 2655,
  repeatability: "±0.02 mm",
  power_consumption: "3.5 kVA",
  controller_type: "R-30iB Plus",
  operating_environment: "Indoor",
  warranty_info: "3 months warranty",
  applications: "Welding|Material Handling",
  category_tags: "used robot|welding",
  certification_standards: "CE|ISO 10218",
  included_accessories: "Teach pendant|Cables",
  description: "Fully tested 6-axis welding robot with controller and teach pendant.",
  image_urls: "https://example.com/robot-1.jpg|https://example.com/robot-2.jpg",
};

const toList = (value: any): string[] => {
  if (value === undefined || value === null || value === "") return [];
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value)
    .split(/[|,;]/)
    .map((v) => v.trim())
    .filter(Boolean);
};

const toNumber = (value: any): number | null => {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const n = Number(String(value).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const normalizeKey = (key: string) =>
  key.trim().toLowerCase().replace(/[\s\-]+/g, "_").replace(/[^a-z0-9_]/g, "");

const BulkRobotUpload = ({ onSuccess }: BulkRobotUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fileName, setFileName] = useState<string>("");
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ inserted: number; failed: number } | null>(null);

  const downloadTemplate = (format: "csv" | "xlsx") => {
    const sheet = XLSX.utils.json_to_sheet([SAMPLE_ROW], { header: TEMPLATE_COLUMNS });
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Robots");
    XLSX.writeFile(book, `robotverse-bulk-robots-template.${format}`, {
      bookType: format === "csv" ? "csv" : "xlsx",
    });
  };

  const validateRow = (raw: ParsedRow, rowNumber: number): ValidatedRow => {
    const row: ParsedRow = {};
    Object.entries(raw).forEach(([k, v]) => {
      row[normalizeKey(k)] = typeof v === "string" ? v.trim() : v;
    });

    const errors: string[] = [];
    const name = row.name || row.robot_name || "";
    const robotType = row.robot_type || row.type || "";
    const price = toNumber(row.price);

    if (!name) errors.push("name is required");
    if (!robotType) errors.push("robot_type is required");
    if (price === null) errors.push("price is required and must be a number");

    const data = {
      name,
      brand: row.brand || null,
      model: row.model || null,
      robot_type: robotType,
      condition: row.condition || "used",
      price,
      currency: (row.currency || "INR").toString().toUpperCase(),
      quantity: toNumber(row.quantity) ?? 1,
      location: row.location || null,
      state: row.state || null,
      pincode: row.pincode ? String(row.pincode) : null,
      year_manufactured: toNumber(row.year_manufactured),
      payload_capacity: toNumber(row.payload_capacity),
      reach: toNumber(row.reach),
      repeatability: row.repeatability || null,
      power_consumption: row.power_consumption || null,
      controller_type: row.controller_type || null,
      operating_environment: row.operating_environment || null,
      warranty_info: row.warranty_info || null,
      applications: toList(row.applications),
      category_tags: toList(row.category_tags),
      certification_standards: toList(row.certification_standards),
      included_accessories: toList(row.included_accessories),
      description: row.description || null,
      images: toList(row.image_urls || row.images),
      availability: "available",
    };

    return { rowNumber, data, errors };
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    setResult(null);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const book = XLSX.read(buffer, { type: "array" });
      const sheet = book.Sheets[book.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { defval: "" });
      const validated = parsed
        .filter((r) => Object.values(r).some((v) => String(v).trim() !== ""))
        .map((r, i) => validateRow(r, i + 2));
      setRows(validated);
      if (validated.length === 0) {
        toast({ variant: "destructive", title: "Empty file", description: "No data rows found in the file." });
      }
    } catch (error) {
      console.error("Bulk parse error:", error);
      toast({
        variant: "destructive",
        title: "Could not read file",
        description: "Please upload a valid .csv, .xlsx or .xls file.",
      });
      setRows([]);
    } finally {
      setParsing(false);
    }
  };

  const validRows = rows.filter((r) => r.errors.length === 0);
  const invalidRows = rows.filter((r) => r.errors.length > 0);

  const handleImport = async () => {
    if (!user || validRows.length === 0) return;
    setUploading(true);
    setProgress(0);
    let inserted = 0;
    let failed = 0;

    const CHUNK = 25;
    for (let i = 0; i < validRows.length; i += CHUNK) {
      const chunk = validRows.slice(i, i + CHUNK);
      const payload = chunk.map((r) => ({ ...r.data, seller_id: user.id }));
      const { error } = await supabase.from("robots").insert(payload as any);
      if (error) {
        console.error("Bulk insert error:", error);
        failed += chunk.length;
      } else {
        inserted += chunk.length;
      }
      setProgress(Math.round(((i + chunk.length) / validRows.length) * 100));
    }

    setUploading(false);
    setResult({ inserted, failed });
    if (inserted > 0) {
      toast({ title: "Bulk upload complete", description: `${inserted} robot listing(s) created.` });
      onSuccess?.();
    }
    if (failed > 0) {
      toast({
        variant: "destructive",
        title: "Some rows failed",
        description: `${failed} row(s) could not be imported. Check the browser console for details.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Robot Upload
          </CardTitle>
          <CardDescription>
            Upload many robot listings at once with a CSV or Excel file. Download the template, fill one robot per row,
            then upload it back.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => downloadTemplate("xlsx")} className="whitespace-normal min-w-fit w-auto">
              <Download className="h-4 w-4 mr-2" />
              Excel template
            </Button>
            <Button variant="outline" onClick={() => downloadTemplate("csv")} className="whitespace-normal min-w-fit w-auto">
              <Download className="h-4 w-4 mr-2" />
              CSV template
            </Button>
          </div>

          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:bg-muted/40 transition-colors">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm font-medium">Click to choose a .csv, .xlsx or .xls file</span>
            <span className="text-xs text-muted-foreground">
              {fileName || "Multi-value fields (applications, tags, image_urls) use | as separator"}
            </span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </label>

          {parsing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading file...
            </div>
          )}

          <Alert>
            <AlertDescription className="text-xs">
              Required columns: <strong>name</strong>, <strong>robot_type</strong>, <strong>price</strong>. Images must be
              public URLs — for uploading photos from your computer, use the single robot form.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
              Preview
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> {validRows.length} ready
              </Badge>
              {invalidRows.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" /> {invalidRows.length} with errors
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Rows with errors are skipped during import.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-[420px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">Row</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.rowNumber}>
                      <TableCell className="text-muted-foreground">{r.rowNumber}</TableCell>
                      <TableCell className="font-medium">{r.data.name || "—"}</TableCell>
                      <TableCell>{r.data.brand || "—"}</TableCell>
                      <TableCell>{r.data.robot_type || "—"}</TableCell>
                      <TableCell>{r.data.price ?? "—"}</TableCell>
                      <TableCell>{r.data.location || "—"}</TableCell>
                      <TableCell>
                        {r.errors.length === 0 ? (
                          <Badge variant="secondary">Ready</Badge>
                        ) : (
                          <span className="text-xs text-destructive">{r.errors.join(", ")}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {uploading && <Progress value={progress} />}

            {result && (
              <Alert>
                <AlertDescription>
                  Imported {result.inserted} listing(s){result.failed > 0 ? `, ${result.failed} failed` : ""}.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleImport}
                disabled={uploading || validRows.length === 0}
                className="whitespace-normal min-w-fit w-auto"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" /> Import {validRows.length} robot(s)
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setRows([]);
                  setFileName("");
                  setResult(null);
                }}
                disabled={uploading}
                className="whitespace-normal min-w-fit w-auto"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkRobotUpload;
