import { useState } from "react";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";
import { Link } from "@/lib/router-compat";
import { ChevronRight, ChevronDown, Globe, Bot, Cog, Truck, Banknote, BookOpen, Wrench, Shield, HelpCircle, Monitor, Code, Cpu } from "lucide-react";
import { ROBOT_TYPES, SERVICE_TYPES, LOGISTICS_TYPES, FINANCE_TYPES, ROBOBOOK_CATEGORIES, ROBOBOOK_CATEGORY_LABELS } from "@/constants/navigationMenus";
import { SPARE_PARTS_TAXONOMY } from "@/constants/sparePartsCategories";
import { cn } from "@/lib/utils";

interface TreeNodeProps {
  label: string;
  href?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  level?: number;
  defaultOpen?: boolean;
  count?: number;
}

const TreeNode = ({ label, href, children, icon, level = 0, defaultOpen = false, count }: TreeNodeProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = !!children;

  const paddingLeft = level * 20;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-lg transition-all duration-200 group cursor-pointer",
          level === 0 && "bg-card border border-border hover:border-primary/30 hover:shadow-xs mb-1",
          level === 1 && "hover:bg-accent/50 ml-2",
          level === 2 && "hover:bg-accent/30 ml-4",
          level === 3 && "hover:bg-accent/20 ml-6",
        )}
        style={{ paddingLeft: level > 0 ? `${paddingLeft}px` : undefined }}
        onClick={() => hasChildren && setOpen(!open)}
      >
        {hasChildren ? (
          <span className="text-muted-foreground transition-transform duration-200 shrink-0">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        ) : (
          <span className="w-4 shrink-0" />
        )}

        {icon && <span className="text-primary shrink-0">{icon}</span>}

        {href ? (
          <Link
            to={href}
            className={cn(
              "transition-colors flex-1 truncate",
              level === 0 && "font-semibold text-foreground group-hover:text-primary",
              level === 1 && "font-medium text-foreground/90 group-hover:text-primary text-sm",
              level === 2 && "text-muted-foreground group-hover:text-primary text-sm",
              level === 3 && "text-muted-foreground/80 group-hover:text-primary text-xs",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {label}
          </Link>
        ) : (
          <span
            className={cn(
              "flex-1 truncate",
              level === 0 && "font-semibold text-foreground",
              level === 1 && "font-medium text-foreground/90 text-sm",
              level === 2 && "text-muted-foreground text-sm",
              level === 3 && "text-muted-foreground/80 text-xs",
            )}
          >
            {label}
          </span>
        )}

        {count !== undefined && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
            {count}
          </span>
        )}
      </div>

      {hasChildren && open && (
        <div className={cn(
          "overflow-hidden animate-in slide-in-from-top-1 duration-200",
          level === 0 && "border-l-2 border-primary/10 ml-5 pl-1 mb-2"
        )}>
          {children}
        </div>
      )}
    </div>
  );
};

const Sitemap = () => {
  const totalSparePartsItems = SPARE_PARTS_TAXONOMY.reduce(
    (sum, cat) => sum + cat.subcategories.reduce((s, sub) => s + sub.componentTypes.length, 0), 0
  );

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />

      <main className="container mx-auto px-4 py-10">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Globe className="h-4 w-4" />
              Complete Site Directory
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-3">
              Sitemap
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Explore every section of RobotVerse. Hover or click to expand categories and discover all pages.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-2">
              {/* Main Pages */}
              <TreeNode label="Main Pages" icon={<Globe className="h-4 w-4" />} defaultOpen count={7}>
                <TreeNode label="Home" href="/" level={1} />
                <TreeNode label="Robots" href="/robots" level={1} />
                <TreeNode label="Spare Parts" href="/parts" level={1} />
                <TreeNode label="Services" href="/services" level={1} />
                <TreeNode label="Logistics" href="/logistics" level={1} />
                <TreeNode label="Financing" href="/financing" level={1} />
                <TreeNode label="RoboBook" href="/robobook" level={1} />
              </TreeNode>

              {/* Robots */}
              <TreeNode label="Robots" icon={<Bot className="h-4 w-4" />} count={ROBOT_TYPES.length}>
                {ROBOT_TYPES.map(type => (
                  <TreeNode
                    key={type}
                    label={type}
                    href={`/robots?type=${encodeURIComponent(type)}`}
                    level={1}
                  />
                ))}
              </TreeNode>

              {/* Spare Parts - Full 3-level hierarchy */}
              <TreeNode label="Spare Parts" icon={<Cpu className="h-4 w-4" />} count={totalSparePartsItems}>
                {SPARE_PARTS_TAXONOMY.map(category => (
                  <TreeNode
                    key={category.slug}
                    label={category.name}
                    href={`/spares/${category.slug}`}
                    level={1}
                    count={category.subcategories.length}
                    icon={
                      category.icon === "Cpu" ? <Cpu className="h-3.5 w-3.5" /> :
                      category.icon === "Monitor" ? <Monitor className="h-3.5 w-3.5" /> :
                      category.icon === "Wrench" ? <Wrench className="h-3.5 w-3.5" /> :
                      category.icon === "Code" ? <Code className="h-3.5 w-3.5" /> : null
                    }
                  >
                    {category.subcategories.map(sub => (
                      <TreeNode
                        key={sub.slug}
                        label={sub.name}
                        href={`/spares/${category.slug}/${sub.slug}`}
                        level={2}
                        count={sub.componentTypes.length}
                      >
                        {sub.componentTypes.map(ct => (
                          <TreeNode
                            key={ct.slug}
                            label={ct.name}
                            href={`/spares/${category.slug}/${sub.slug}/${ct.slug}`}
                            level={3}
                          />
                        ))}
                      </TreeNode>
                    ))}
                  </TreeNode>
                ))}
              </TreeNode>

              {/* Services */}
              <TreeNode label="Services" icon={<Cog className="h-4 w-4" />} count={SERVICE_TYPES.length}>
                {SERVICE_TYPES.map(type => (
                  <TreeNode
                    key={type}
                    label={type}
                    href={`/services?type=${encodeURIComponent(type)}`}
                    level={1}
                  />
                ))}
              </TreeNode>
            </div>

            {/* Right Column */}
            <div className="space-y-2">
              {/* Logistics */}
              <TreeNode label="Logistics" icon={<Truck className="h-4 w-4" />} count={LOGISTICS_TYPES.length}>
                {LOGISTICS_TYPES.map(type => (
                  <TreeNode
                    key={type}
                    label={type}
                    href={`/logistics?type=${encodeURIComponent(type)}`}
                    level={1}
                  />
                ))}
              </TreeNode>

              {/* Financing */}
              <TreeNode label="Financing" icon={<Banknote className="h-4 w-4" />} count={FINANCE_TYPES.length}>
                {FINANCE_TYPES.map(type => (
                  <TreeNode
                    key={type}
                    label={type}
                    href={`/financing?type=${encodeURIComponent(type)}`}
                    level={1}
                  />
                ))}
              </TreeNode>

              {/* RoboBook */}
              <TreeNode label="RoboBook" icon={<BookOpen className="h-4 w-4" />} count={ROBOBOOK_CATEGORIES.length}>
                {ROBOBOOK_CATEGORIES.map(cat => (
                  <TreeNode
                    key={cat}
                    label={ROBOBOOK_CATEGORY_LABELS[cat] || cat}
                    href={`/robobook?category=${encodeURIComponent(cat)}`}
                    level={1}
                  />
                ))}
              </TreeNode>

              {/* Guides & Support */}
              <TreeNode label="Guides & Support" icon={<HelpCircle className="h-4 w-4" />} count={4}>
                <TreeNode label="Buyer Guide" href="/buyer-guide" level={1} />
                <TreeNode label="Seller Guide" href="/seller-guide" level={1} />
                <TreeNode label="Contact Us" href="/contact" level={1} />
                <TreeNode label="Help Center" href="/dashboard/help" level={1} />
              </TreeNode>

              {/* Legal */}
              <TreeNode label="Legal" icon={<Shield className="h-4 w-4" />} count={4}>
                <TreeNode label="Terms of Service" href="/terms" level={1} />
                <TreeNode label="Privacy Policy" href="/privacy" level={1} />
                <TreeNode label="Cookie Policy" href="/cookies" level={1} />
                <TreeNode label="Accessibility" href="/accessibility" level={1} />
              </TreeNode>

              {/* XML Sitemap Link */}
              <div className="mt-6 p-4 bg-muted/50 rounded-xl border border-border">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">For search engines:</span>{" "}
                  XML sitemap available at{" "}
                  <a
                    href="/sitemap.xml"
                    className="text-primary hover:underline font-mono text-xs"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    /sitemap.xml
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Sitemap;
