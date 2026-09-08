import type { LucideIcon } from "lucide-react";
import { LogOut, PanelLeftClose, PanelLeftOpen, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface DashboardNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface DashboardNavigationProps {
  companyName: string;
  workspaceItems: DashboardNavItem[];
  pipelineItems: DashboardNavItem[];
  activeItem: string;
  collapsed?: boolean;
  showCollapseToggle?: boolean;
  onItemSelect: (id: string) => void;
  onCollapseToggle?: () => void;
  onProfileEdit: () => void;
  onSignOut: () => void;
}

const accountItems: DashboardNavItem[] = [
  { id: "account-profile", label: "Profile", icon: User },
  { id: "account-settings", label: "Settings", icon: Settings },
];

const navItemClass = cn(
  "group/nav relative flex h-[34px] w-full min-w-0 items-center gap-[10px] rounded-md px-[10px] text-[13px] leading-[1.4] text-sidebar-foreground/65",
  "transition-[background-color,color] duration-150 ease-out hover:bg-sidebar-foreground/[0.04] hover:text-sidebar-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
  "data-[active=true]:bg-sidebar-foreground/[0.06] data-[active=true]:font-semibold data-[active=true]:text-sidebar-foreground",
  "before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-[1px] before:bg-primary before:opacity-0 data-[active=true]:before:opacity-100",
);

const DashboardNavigation = ({
  companyName,
  workspaceItems,
  pipelineItems,
  activeItem,
  collapsed = false,
  showCollapseToggle = false,
  onItemSelect,
  onCollapseToggle,
  onProfileEdit,
  onSignOut,
}: DashboardNavigationProps) => {
  const renderItem = (item: DashboardNavItem, onSelect: () => void) => {
    const Icon = item.icon;
    const button = (
      <Button
        key={item.id}
        type="button"
        variant="ghost"
        data-active={activeItem === item.id}
        className={cn(navItemClass, collapsed && "justify-center px-0")}
        onClick={onSelect}
        aria-current={activeItem === item.id ? "page" : undefined}
      >
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </Button>
    );

    if (!collapsed) return button;

    return (
      <Tooltip key={item.id}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  };

  const renderGroup = (label: string, items: DashboardNavItem[]) => {
    if (items.length === 0) return null;
    return (
      <section className="mt-6">
        {!collapsed && (
          <h2 className="mb-2 px-[10px] text-[11px] font-normal uppercase leading-[1.4] tracking-[0.06em] text-sidebar-foreground/45">
            {label}
          </h2>
        )}
        <div className="space-y-1">
          {items.map((item) => renderItem(item, () => onItemSelect(item.id)))}
        </div>
      </section>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className={cn("flex h-[52px] shrink-0 items-center px-4", collapsed ? "justify-center px-2" : "justify-between")}>
        {!collapsed && <p className="min-w-0 truncate text-sm font-semibold leading-[1.4]">{companyName}</p>}
        {showCollapseToggle && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-md text-sidebar-foreground/65 hover:bg-sidebar-foreground/[0.04] hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
            onClick={onCollapseToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" strokeWidth={1.5} /> : <PanelLeftClose className="h-4 w-4" strokeWidth={1.5} />}
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {renderGroup("Workspace", workspaceItems)}
        {renderGroup("Pipeline", pipelineItems)}
        {renderGroup("Account", accountItems)}
      </div>

      <div className="shrink-0 border-t border-sidebar-foreground/10 p-2">
        {renderItem(
          { id: "sign-out", label: "Sign Out", icon: LogOut },
          onSignOut,
        )}
      </div>
    </div>
  );
};

export default DashboardNavigation;