import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MousePointer } from "lucide-react";
import ButtonTrackingDashboard from "@/components/ButtonTrackingDashboard";

const AdminTracking = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">User Interaction Tracking</h2>
        <p className="text-muted-foreground">Monitor all user button clicks and interactions across the platform</p>
      </div>

      <Card className="bg-primary/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <MousePointer className="w-8 h-8 text-primary" />
            <div>
              <h3 className="font-semibold text-primary">Button Interaction Tracking</h3>
              <p className="text-sm text-primary/80">
                Real-time tracking of all user button clicks across the platform
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ButtonTrackingDashboard />
    </div>
  );
};

export default AdminTracking;