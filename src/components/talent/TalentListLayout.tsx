import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, SlidersHorizontal } from "lucide-react";

interface TalentListLayoutProps {
  /** Label used in "Filter …" and "Showing N …", e.g. "Jobs" */
  noun: string;
  filters: ReactNode;
  count: number;
  isLoading: boolean;
  hasFilters: boolean;
  onClear: () => void;
  children: ReactNode;
}

// Left filter sidebar + top bar layout shared by the Robot Talent lists,
// matching the Robots / Spare Parts / Directory listing pages.
const TalentListLayout = ({ noun, filters, count, isLoading, hasFilters, onClear, children }: TalentListLayoutProps) => {
  const panel = (
    <div className="space-y-4">
      {filters}
      {hasFilters && (
        <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={onClear}>
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <aside className="hidden w-72 flex-shrink-0 lg:block">
        <div className="sticky top-20">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-4 w-4" />
                Filter {noun}
              </CardTitle>
            </CardHeader>
            <CardContent>{panel}</CardContent>
          </Card>
        </div>
      </aside>

      <div className="w-full min-w-0 flex-1 space-y-4">
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-muted-foreground">
              {isLoading ? (
                "Loading…"
              ) : (
                <>
                  Showing <span className="font-semibold text-foreground">{count}</span> {noun.toLowerCase()}
                </>
              )}
            </p>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle>Filter {noun}</SheetTitle>
                </SheetHeader>
                {panel}
              </SheetContent>
            </Sheet>
          </CardContent>
        </Card>
        {children}
      </div>
    </div>
  );
};

export default TalentListLayout;
