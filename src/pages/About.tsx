import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Bot, Boxes, Cog, Factory, Gavel, GraduationCap, Mail, MapPin, Phone, ShieldCheck, Truck, Wallet } from "lucide-react";
import EnhancedHeader from "@/components/EnhancedHeader";
import Footer from "@/components/Footer";

const OFFER = [
  { icon: Bot, title: "Industrial robots", text: "New, used and refurbished robots from FANUC, ABB, KUKA, Yaskawa, Kawasaki, Universal Robots and more, with payload, reach, year and controller.", to: "/robots" },
  { icon: Cog, title: "Robot spare parts", text: "Servo motors, amplifiers, teach pendants, cables, reducers, grippers and other parts by brand and part number.", to: "/parts" },
  { icon: Factory, title: "Automation services", text: "Integrators and engineers for installation, programming, AMC, repair and retrofits.", to: "/services" },
  { icon: Boxes, title: "Automation Studio", text: "Describe a job or build a robot cell in 3D, and see robots, tools, safety, cycle time, budget and payback.", to: "/automation-studio" },
  { icon: Gavel, title: "Auctions", text: "Live and upcoming auctions for used robots and automation equipment.", to: "/auctions" },
  { icon: Truck, title: "Logistics", text: "Transport partners for robots and heavy machinery, with insurance and tracking.", to: "/logistics" },
  { icon: Wallet, title: "Financing", text: "Loans and leasing for robots and automation equipment.", to: "/financing" },
  { icon: GraduationCap, title: "Talent & training", text: "Robotics jobs and robot programming training across India.", to: "/robot-talent" },
];

/** About RobotVerse — who we are and what the marketplace offers. */
export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>About RobotVerse — India's Industrial Robotics Marketplace</title>
        <meta
          name="description"
          content="RobotVerse connects Indian manufacturers with verified sellers of industrial robots, spare parts, services, logistics and finance."
        />
        <link rel="canonical" href="https://www.robotverse.in/about" />
      </Helmet>
      <EnhancedHeader />
      <main className="container mx-auto max-w-5xl px-4 pb-16">
        <header className="pb-8 pt-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">About RobotVerse</p>
          <h1 className="mt-2 max-w-[24ch] text-3xl font-bold leading-tight tracking-tight sm:text-4xl">India's marketplace for industrial robots and automation</h1>
          <p className="mt-3 max-w-[65ch] text-muted-foreground">
            RobotVerse helps Indian manufacturers buy, sell, plan and maintain industrial robots. Buyers compare listings with real
            specifications, request quotations and bid in auctions; sellers list robots, spare parts and robotics services; engineers plan
            robot cells in 3D before they buy.
          </p>
        </header>

        <section aria-labelledby="offer">
          <h2 id="offer" className="text-lg font-semibold">What you can do on RobotVerse</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {OFFER.map(({ icon: Icon, title, text, to }) => (
              <Link key={title} to={to} className="flex gap-3 rounded-xl border border-border bg-card p-4 transition-colors duration-150 hover:border-primary/60">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <span>
                  <b className="block text-sm">{title}</b>
                  <span className="text-sm text-muted-foreground">{text}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="how" className="mt-10 grid gap-6 md:grid-cols-2">
          <div>
            <h2 id="how" className="text-lg font-semibold">How buying works</h2>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>Find a robot or part by brand, model, payload, reach, city or application.</li>
              <li>Request a quotation — seller contact details stay masked until you choose to proceed.</li>
              <li>Arrange inspection, transport and financing with RobotVerse partners.</li>
            </ol>
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden /> Trust
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Listings carry structured specifications and the seller's own price where published. We do not publish invented prices or
              specifications. See the <Link to="/buyer-guide" className="text-primary underline-offset-4 hover:underline">buyer guide</Link> and{" "}
              <Link to="/seller-guide" className="text-primary underline-offset-4 hover:underline">seller guide</Link>.
            </p>
          </div>
        </section>

        <section aria-labelledby="contact" className="mt-10 rounded-2xl border border-border bg-card p-5">
          <h2 id="contact" className="text-lg font-semibold">Contact</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              No. 309A, ECR, Near PEC &amp; PU, Pillaichavady, Vanur Taluk, Villupuram District, Tamil Nadu 605014, India
            </li>
            <li className="flex gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <a href="tel:+918610925352" className="hover:text-primary">+91 86109 25352</a>
            </li>
            <li className="flex gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <a href="mailto:support@robotverse.in" className="hover:text-primary">support@robotverse.in</a>
            </li>
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
