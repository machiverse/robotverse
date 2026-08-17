import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { KB_CATEGORIES, relativeTime, type WaKbEntry } from "./waTypes";

const emptyForm = {
  id: "",
  entry_key: "",
  category: "general",
  title: "",
  content: "",
  keywords: "",
  is_active: true,
};

const WhatsAppKnowledgeBase = () => {
  const [entries, setEntries] = useState<WaKbEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const { data, error } = await supabase.from("whatsapp_kb").select("*").order("category").order("title");
    if (error) toast.error(error.message);
    setEntries((data ?? []) as WaKbEntry[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (e: WaKbEntry) => {
    setForm({
      id: e.id,
      entry_key: e.entry_key,
      category: e.category,
      title: e.title,
      content: e.content,
      keywords: (e.keywords ?? []).join(", "),
      is_active: e.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    setSaving(true);
    const payload = {
      entry_key: (form.entry_key || form.title).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
      category: form.category,
      title: form.title.trim(),
      content: form.content.trim(),
      keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
      is_active: form.is_active,
    };
    const { error } = form.id
      ? await supabase.from("whatsapp_kb").update(payload).eq("id", form.id)
      : await supabase.from("whatsapp_kb").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(form.id ? "Entry updated" : "Entry added");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("whatsapp_kb").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Entry deleted");
    load();
  };

  const toggleActive = async (e: WaKbEntry) => {
    const { error } = await supabase.from("whatsapp_kb").update({ is_active: !e.is_active }).eq("id", e.id);
    if (error) return toast.error(error.message);
    load();
  };

  const filtered = entries.filter((e) => {
    const matchCat = category === "all" || e.category === category;
    const q = search.trim().toLowerCase();
    const matchQ =
      !q ||
      e.title.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      (e.keywords ?? []).some((k) => k.toLowerCase().includes(q));
    return matchCat && matchQ;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search knowledge base" className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {KB_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={openNew} className="w-auto min-w-fit whitespace-normal bg-[#25D366] hover:bg-[#128C7E]">
          <Plus className="mr-2 h-4 w-4" /> Add Entry
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-36 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">No entries match your filters.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((e) => (
            <Card key={e.id} className="border-border shadow-sm">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.category.replace("_", " ")} • updated {relativeTime(e.updated_at)}
                    </p>
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-1">
                    <Switch checked={e.is_active} onCheckedChange={() => toggleActive(e)} />
                    <Button variant="ghost" size="icon" onClick={() => openEdit(e)} aria-label="Edit entry">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(e.id)} aria-label="Delete entry">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{e.content}</p>
                <div className="flex flex-wrap gap-1">
                  {(e.keywords ?? []).slice(0, 6).map((k) => (
                    <Badge key={k} variant="secondary" className="text-xs">
                      {k}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit entry" : "New knowledge entry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" />
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KB_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Answer content the bot should use"
              rows={7}
            />
            <Input
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              placeholder="Keywords, comma separated"
            />
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              Active
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" className="w-auto min-w-fit whitespace-normal" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving} className="w-auto min-w-fit whitespace-normal bg-[#25D366] hover:bg-[#128C7E]">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhatsAppKnowledgeBase;
