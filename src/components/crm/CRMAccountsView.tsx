import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Search, Phone, Mail, MapPin } from "lucide-react";
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredAccounts.map((account) => (
          <Card key={account.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-100 p-2"><Building2 className="h-5 w-5 text-blue-600" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{account.account_name}</p>
                  <Badge variant="outline" className="mt-1 capitalize">{account.account_type}</Badge>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {account.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{account.phone}</div>}
                    {account.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{account.email}</div>}
                    {account.city && <div className="flex items-center gap-1"><MapPin className="h-3 w-3" />{account.city}, {account.state}</div>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredAccounts.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mb-2 opacity-50" />
            <p>No accounts found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CRMAccountsView;
