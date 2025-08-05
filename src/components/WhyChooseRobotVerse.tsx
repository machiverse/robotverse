import { 
  Shield, 
  CheckCircle, 
  Users, 
  Cpu, 
  Zap, 
  HeartHandshake, 
  Truck, 
  Package, 
  Wrench,
  GraduationCap,
  CreditCard 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const WhyChooseRobotVerseRobotics = () => {
  const benefits = [
    {
      icon: Shield,
      title: "Verified Robotics Partners",
      description:
        "All robot manufacturers, service providers, and technology partners go through rigorous verification to ensure authenticity and quality.",
      gradient: "from-green-600 to-emerald-700",
    },
    {
      icon: Cpu,
      title: "Cutting-Edge Technology",
      description:
        "Access the latest industrial robots equipped with AI, machine learning, and advanced automation capabilities.",
      gradient: "from-blue-600 to-cyan-700",
    },
    {
      icon: Zap,
      title: "Fast Robot Matching & Deployment",
      description:
        "Lightning-fast quotes and AI-driven matching help you select, purchase, and deploy the right robot for your production needs.",
      gradient: "from-yellow-500 to-orange-600",
    },
    {
      icon: Wrench,
      title: "Comprehensive Maintenance & Repair",
      description:
        "Scheduled preventive maintenance and on-demand repairs by certified technicians keep your robots operating seamlessly.",
      gradient: "from-purple-600 to-violet-700",
    },
    {
      icon: Package,
      title: "Original Spare Parts",
      description:
        "Genuine and compatible spare parts available directly from trusted suppliers to maximize uptime.",
      gradient: "from-yellow-400 to-amber-500",
    },
    {
      icon: Truck,
      title: "Specialized Logistics for Robotics",
      description:
        "End-to-end logistics managing fragile and complex robotics equipment with care and precision.",
      gradient: "from-orange-500 to-red-600",
    },
    {
      icon: GraduationCap,
      title: "Hands-On Training & Certification",
      description:
        "Operator training, safety certification, and technical education programs tailored for robotics professionals.",
      gradient: "from-pink-600 to-rose-700",
    },
    {
      icon: CreditCard,
      title: "Flexible Financing & Insurance",
      description:
        "Customized financing plans and insurance coverage designed to protect your robotics investment.",
      gradient: "from-indigo-600 to-blue-700",
    },
    {
      icon: HeartHandshake,
      title: "End-to-End Robotics Ecosystem",
      description:
        "From selecting a robot to installation, maintenance, spare parts, training, logistics, financing, and insurance — everything in one trusted platform.",
      gradient: "from-teal-500 to-cyan-600",
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-muted/20 to-background">
      <div className="container mx-auto px-4">
        <header className="text-center mb-16 max-w-4xl mx-auto">
          <h2 className="text-5xl font-extrabold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent leading-tight">
            Why Choose RobotVerse for Robotics?
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            The most comprehensive marketplace and support platform dedicated to industrial robots and automation solutions.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
          {benefits.map(({ icon: Icon, title, description, gradient }) => (
            <Card
              key={title}
              className="bg-card/90 backdrop-blur-md border border-border hover:shadow-2xl transition-shadow duration-500 group cursor-pointer"
              tabIndex={0}
              role="region"
              aria-label={title}
            >
              <CardContent className="p-7 text-center">
                <div
                  className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-r ${gradient} text-white group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="h-8 w-8" aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-foreground">{title}</h3>
                <p className="text-base text-muted-foreground leading-relaxed">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseRobotVerseRobotics;
