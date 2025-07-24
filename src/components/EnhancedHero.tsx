import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import industrialRobotHero from "@/assets/industrial-robot-hero.jpg";

const heroSlides = [
  {
    id: 1,
    title: "Advanced Manufacturing Equipment",
    subtitle: "Discover cutting-edge industrial machinery for modern manufacturing",
    image: industrialRobotHero,
    category: "Manufacturing"
  },
  {
    id: 2,
    title: "Heavy Construction Machinery",
    subtitle: "Find powerful equipment for construction and infrastructure projects",
    image: industrialRobotHero,
    category: "Construction"
  },
  {
    id: 3,
    title: "Agricultural Machinery Solutions",
    subtitle: "Explore modern farming equipment for enhanced productivity",
    image: industrialRobotHero,
    category: "Agriculture"
  }
];

const categories = [
  "All Categories",
  "Industrial Robots",
  "Manufacturing Equipment",
  "Construction Machinery",
  "Agricultural Equipment",
  "Spare Parts",
  "Services"
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const handleSearch = () => {
    console.log("Search:", { searchQuery, selectedCategory, selectedLocation });
  };

  return (
    <section className="relative min-h-screen flex items-center bg-gradient-hero overflow-hidden">
      {/* Background Image with Carousel */}
      <div className="absolute inset-0">
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <img 
              src={slide.image} 
              alt={slide.title}
              className="w-full h-full object-cover opacity-30"
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent"></div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 bg-primary/20 backdrop-blur-sm border border-primary/30 rounded-full flex items-center justify-center hover:bg-primary/30 transition-all"
      >
        <ChevronLeft className="w-6 h-6 text-primary" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 bg-primary/20 backdrop-blur-sm border border-primary/30 rounded-full flex items-center justify-center hover:bg-primary/30 transition-all"
      >
        <ChevronRight className="w-6 h-6 text-primary" />
      </button>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            {heroSlides[currentSlide].title}
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl">
            {heroSlides[currentSlide].subtitle}
          </p>

          {/* Advanced Search */}
          <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-6 mb-8 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search machines, parts, services..."
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
              Explore Marketplace
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6">
              Start Selling
            </Button>
          </div>

          {/* Slide Indicators */}
          <div className="flex space-x-2">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentSlide 
                    ? "bg-primary scale-125" 
                    : "bg-primary/30 hover:bg-primary/50"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default EnhancedHero;