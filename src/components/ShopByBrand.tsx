import { Link } from "react-router-dom";
import { OEM_BRANDS } from "@/constants/navigationMenus";
import { OemDot } from "@/components/oem/OemAccents";
import { PixelArrow } from "@/components/hero/HeroConsole";
import { BevelBox, ConsoleLink, SectionHead, pad2 } from "@/components/console/ConsoleUI";

/**
 * Homepage "Shop by Brand" section.
 * Renders crawlable <a href> links to each OEM brand landing page.
 */
const ShopByBrand = () => {
  return (
    <section className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-14 md:py-20">
        <SectionHead
          index="002"
          label="OEM index"
          title="Shop by Brand"
          subtitle="Used and new industrial robots from the world's leading manufacturers."
          action={<ConsoleLink to="/robots">View all robots</ConsoleLink>}
        />

        <BevelBox innerClassName="grid grid-cols-2 gap-px bg-border lg:grid-cols-7">
          {OEM_BRANDS.map((brand, i) => (
            <Link
              key={brand.slug}
              to={`/robots/brand/${brand.slug}`}
              className="group flex min-h-[112px] flex-col justify-between bg-card p-4 no-underline transition-colors duration-150 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            >
              <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {pad2(i + 1)}
                <PixelArrow className="text-muted-foreground transition-colors duration-150 group-hover:text-primary" />
              </span>
              <span className="flex items-center gap-2 text-base font-semibold uppercase tracking-[-0.01em] text-foreground transition-colors duration-150 group-hover:text-primary">
                <OemDot brand={brand.label} />
                {brand.label}
              </span>
            </Link>
          ))}
        </BevelBox>
      </div>
    </section>
  );
};

export default ShopByBrand;
