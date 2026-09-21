import { Link } from "react-router-dom";
import { Factory, ArrowRight } from "lucide-react";
import { OEM_BRANDS } from "@/constants/navigationMenus";
import { OemDot } from "@/components/oem/OemAccents";

/**
 * Homepage "Shop by Brand" section.
 * Renders crawlable <a href> links to each OEM brand landing page.
 */
const ShopByBrand = () => {
  return (
    <section className="border-t border-border bg-muted/20">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Shop by Brand</h2>
            <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
              Browse used and new industrial robots from the world's leading OEM manufacturers.
            </p>
          </div>
          <Link
            to="/robots"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline shrink-0"
          >
            View all robots
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {OEM_BRANDS.map((brand) => (
            <Link
              key={brand.slug}
              to={`/robots/brand/${brand.slug}`}
              className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-5 text-center shadow-sm hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                <Factory className="h-5 w-5 text-primary" />
              </span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                <OemDot brand={brand.label} />
                {brand.label}
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-6 text-center sm:hidden">
          <Link to="/robots" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            View all robots
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ShopByBrand;
