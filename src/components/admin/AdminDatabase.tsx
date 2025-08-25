import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";
import DatabaseTableManager from "@/components/DatabaseTableManager";

const AdminDatabase = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Database Management</h2>
        <p className="text-muted-foreground">Direct access to all database tables and records</p>
      </div>

      <Card className="bg-destructive/10 border-destructive/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-destructive" />
            <div>
              <h3 className="font-semibold text-destructive">Database Management</h3>
              <p className="text-sm text-destructive/80">
                Direct database access - use with extreme caution! Changes are permanent.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <DatabaseTableManager />
    </div>
  );
};

export default AdminDatabase;