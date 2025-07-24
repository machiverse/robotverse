import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import industrialRobotHero from "@/assets/industrial-robot-hero.jpg";

const heroContent = {
  title: "Advanced Industrial Robots",
  subtitle: "Discover cutting-edge industrial robots for modern manufacturing and automation",
  image: industrialRobotHero
};

const categories = [
  "All Categories",
  "Industrial Robots",
  "Articulated Robots",
  "SCARA Robots",
  "Delta Robots",
  "Collaborative Robots",
  "Spare Parts"
];

const locations = [
  "All Locations",
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Chennai",
  "Pune",
  "Hyderabad",
  "Kolkata"
];

const EnhancedHero = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");

  const handleSearch = () => {
    console.log("Search:", { searchQuery, selectedCategory, selectedLocation });
  };

  return (
    <section className="relative min-h-screen flex items-center bg-gradient-hero overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={heroContent.image} 
          alt={heroContent.title}
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            {heroContent.title}
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl">
            {heroContent.subtitle}
          </p>

          {/* Advanced Search */}
          <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-6 mb-8 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search robots, parts, services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 text-lg bg-input border-border"
                  />
                </div>
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-12 bg-input border-border">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="h-12 bg-input border-border">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleSearch}
              className="w-full mt-4 h-12 text-lg bg-primary hover:bg-primary-glow"
            >
              <Search className="w-5 h-5 mr-2" />
              Search
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Button variant="hero" size="lg" className="text-lg px-8 py-6">
              Explore Robots
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6">
              Start Selling
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EnhancedHero;