import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Wrench, Package } from "lucide-react";

interface AdminEquipmentProps {
  robots: any[];
  services: any[];
  spareParts: any[];
  onRefresh: () => void;
}

const AdminEquipment = ({ robots, services, spareParts, onRefresh }: AdminEquipmentProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Equipment Management</h2>
          <p className="text-muted-foreground">Manage robots, spare parts, and services</p>
        </div>
        <Button onClick={onRefresh} variant="outline">
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Robots ({robots.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Manage robot listings and specifications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Spare Parts ({spareParts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Manage spare parts inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Services ({services.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Manage service offerings</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminEquipment;