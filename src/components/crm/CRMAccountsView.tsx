import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Plus, Search } from "lucide-react";
import type { useCRM } from "@/hooks/useCRM";

interface CRMAccountsViewProps {
  crmData: ReturnType<typeof useCRM>;
}

const CRMAccountsView = ({ crmData }: CRMAccountsViewProps) => {
  const { accounts } = crmData;
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAccounts = accounts.filter((acc) =>
    acc.account_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Accounts ({accounts.length})</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search accounts..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-64" />
          </div>
          <Button><Plus className="mr-2 h-4 w-4" />Add Account</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-foreground/10 bg-card">
        <table className="w-full min-w-[720px] border-collapse text-[13px] leading-[1.4]">
          <thead className="sticky top-0 z-10 bg-card text-left text-[11px] font-normal uppercase tracking-[0.06em] text-foreground/45">
            <tr className="h-10 border-b border-foreground/10">
              <th className="px-4 font-normal">Account</th><th className="px-4 font-normal">Type</th><th className="px-4 font-normal">Email</th><th className="px-4 font-normal">Phone</th><th className="px-4 font-normal">Location</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.map((account) => (
              <tr key={account.id} tabIndex={0} className="h-11 border-b border-foreground/[0.06] text-foreground/65 transition-[background-color,color] duration-150 ease-out last:border-b-0 hover:bg-foreground/[0.03] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                <td className="px-4 font-semibold text-foreground">{account.account_name}</td><td className="px-4 capitalize">{account.account_type}</td><td className="px-4">{account.email || '—'}</td><td className="px-4 tabular-nums">{account.phone || '—'}</td><td className="px-4">{account.city ? `${account.city}, ${account.state || ''}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredAccounts.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-[13px] text-foreground/65">
            <Building2 className="h-4 w-4" strokeWidth={1.5} /><p>Customer accounts you add will appear here.</p><Button size="sm"><Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />Add Account</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CRMAccountsView;
