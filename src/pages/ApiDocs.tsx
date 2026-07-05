import EnhancedHeader from '@/components/EnhancedHeader';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Key, Shield, Zap, Webhook, Code } from 'lucide-react';

const BASE = 'https://cmahwgetrqczytnijbuk.supabase.co/functions/v1/api-v1';

function Code({ children }: { children: React.ReactNode }) {
  return <pre className="bg-muted text-sm p-3 rounded overflow-x-auto"><code>{children}</code></pre>;
}

function Endpoint({ method, path, desc, example }: { method: string; path: string; desc: string; example?: string }) {
  const colors: Record<string, string> = { GET: 'bg-blue-500', POST: 'bg-green-600', PATCH: 'bg-amber-500', DELETE: 'bg-red-600' };
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={colors[method] + ' text-white'}>{method}</Badge>
        <code className="font-mono text-sm">{path}</code>
      </div>
      <p className="text-sm text-muted-foreground">{desc}</p>
      {example && <Code>{example}</Code>}
    </div>
  );
}

export default function ApiDocs() {
  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <div className="container mx-auto max-w-5xl px-4 py-10 space-y-10">
        <header className="space-y-3">
          <h1 className="text-4xl font-bold">RobotVerse REST API</h1>
          <p className="text-lg text-muted-foreground">
            Access robots, spare parts, services, sellers, categories, manufacturers, and search — securely, from any external system.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button asChild><Link to="/dashboard/api-keys"><Key className="w-4 h-4 mr-2" /> Get your API key</Link></Button>
            <Button asChild variant="outline"><a href={BASE} target="_blank" rel="noreferrer">Live status</a></Button>
          </div>
        </header>

        <section className="grid md:grid-cols-3 gap-4">
          <Card><CardHeader><Shield className="w-5 h-5" /><CardTitle className="text-base">API Key auth</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Header <code className="text-xs">x-api-key: rv_live_…</code></CardContent></Card>
          <Card><CardHeader><Zap className="w-5 h-5" /><CardTitle className="text-base">1000 req/hour</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Free tier. Rolling per-hour budget per key.</CardContent></Card>
          <Card><CardHeader><Webhook className="w-5 h-5" /><CardTitle className="text-base">Webhooks</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Subscribe to new listings, leads, auctions.</CardContent></Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Base URL</h2>
          <Code>{BASE}</Code>
          <h3 className="font-semibold mt-4">Authentication</h3>
          <p className="text-sm text-muted-foreground">Send your API key on every request:</p>
          <Code>{`curl "${BASE}/v1/robots?limit=5" \\
  -H "x-api-key: rv_live_YOUR_KEY_HERE"`}</Code>
          <p className="text-sm text-muted-foreground">All responses are JSON with the shape <code>{'{ "data": ..., "pagination": {...} }'}</code> or <code>{'{ "error": "..." }'}</code>.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Scopes</h2>
          <ul className="text-sm space-y-1">
            <li><Badge variant="outline">read</Badge> — Catalog endpoints (default)</li>
            <li><Badge variant="outline">write</Badge> — Create/update your own listings, submit leads and quotes</li>
            <li><Badge variant="outline">unlock</Badge> — Reveal seller contacts (spends your credits)</li>
            <li><Badge variant="outline">webhooks</Badge> — Manage webhook subscriptions</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Catalog</h2>
          <Endpoint method="GET" path="/v1/robots" desc="List robots. Query: brand, type, location, search, limit (max 100), offset."
            example={`GET ${BASE}/v1/robots?brand=ABB&limit=20`} />
          <Endpoint method="GET" path="/v1/robots/:id" desc="Fetch a single robot with full specifications and images." />
          <Endpoint method="GET" path="/v1/parts" desc="List spare parts. Query: brand, category, search." />
          <Endpoint method="GET" path="/v1/parts/:id" desc="Fetch a single spare part." />
          <Endpoint method="GET" path="/v1/services" desc="List services. Query: category, location." />
          <Endpoint method="GET" path="/v1/services/:id" desc="Fetch a single service." />
          <Endpoint method="GET" path="/v1/sellers/:id" desc="Public seller profile (contact info excluded)." />
          <Endpoint method="GET" path="/v1/categories" desc="All robot types, spare part categories and service categories." />
          <Endpoint method="GET" path="/v1/manufacturers" desc="Distinct brand/manufacturer list across robots and parts." />
          <Endpoint method="GET" path="/v1/search" desc="Global search across robots/parts/services. Params: q, type=all|robots|parts|services, limit."
            example={`GET ${BASE}/v1/search?q=welding&type=robots`} />
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Contact unlock <Badge className="ml-2">scope: unlock</Badge></h2>
          <p className="text-sm text-muted-foreground">Contact details (email/phone) are hidden by default across all responses. To reveal a seller's contact, call the unlock endpoint — it consumes credits from your RobotVerse balance (10 for robots, 5 for parts).</p>
          <Endpoint method="POST" path="/v1/unlock" desc="Body: { listing_type: 'robot' | 'part' | 'service', listing_id: uuid }"
            example={`curl -X POST "${BASE}/v1/unlock" \\
  -H "x-api-key: rv_live_YOUR_KEY" -H "Content-Type: application/json" \\
  -d '{"listing_type":"robot","listing_id":"..."}'`} />
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Write endpoints <Badge className="ml-2">scope: write</Badge></h2>
          <Endpoint method="POST" path="/v1/robots" desc="Create a robot listing under your account." />
          <Endpoint method="PATCH" path="/v1/robots/:id" desc="Update one of your own robot listings." />
          <Endpoint method="DELETE" path="/v1/robots/:id" desc="Delete one of your own robot listings." />
          <Endpoint method="POST" path="/v1/leads" desc="Submit a lead to a seller." />
          <Endpoint method="POST" path="/v1/quotes" desc="Submit a quote request to a seller." />
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Webhooks <Badge className="ml-2">scope: webhooks</Badge></h2>
          <p className="text-sm text-muted-foreground">Subscribe an HTTPS endpoint to platform events. Each delivery includes an HMAC-SHA256 signature in the <code>X-RobotVerse-Signature</code> header, computed with your signing secret.</p>
          <Endpoint method="GET" path="/v1/webhooks" desc="List your webhook subscriptions." />
          <Endpoint method="POST" path="/v1/webhooks" desc="Body: { url: 'https://your.app/hook', events: ['robot.created','part.created','service.created','lead.created','auction.created','auction.ended'] }. Returns the signing secret once." />
          <Endpoint method="DELETE" path="/v1/webhooks/:id" desc="Remove a subscription." />
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">Rate limits & errors</h2>
          <p className="text-sm text-muted-foreground">1000 requests/hour per key. When exceeded, responses return HTTP 429 with headers <code>X-RateLimit-Limit</code> and <code>X-RateLimit-Remaining</code>. Standard error format:</p>
          <Code>{`{ "error": "Rate limit exceeded", "limit": 1000 }`}</Code>
          <p className="text-sm text-muted-foreground">Status codes: 200 OK · 201 Created · 400 Bad Request · 401 Unauthorized · 402 Insufficient credits · 403 Missing scope · 404 Not found · 429 Rate limited · 500 Server error.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold">SDK quickstart</h2>
          <Code>{`// JavaScript / Node
const res = await fetch("${BASE}/v1/search?q=palletizing", {
  headers: { "x-api-key": process.env.ROBOTVERSE_KEY }
});
const { data } = await res.json();
console.log(data.robots);`}</Code>
          <Code>{`# Python
import os, requests
r = requests.get("${BASE}/v1/robots",
  headers={"x-api-key": os.environ["ROBOTVERSE_KEY"]},
  params={"brand": "ABB", "limit": 20})
print(r.json())`}</Code>
        </section>
      </div>
      <Footer />
    </div>
  );
}
