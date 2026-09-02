import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  DollarSign, 
  Factory, 
  Settings,
  Plus,
  Search,
  Filter
} from "lucide-react";

const jobCategories = [
  "CNC Machining",
  "Welding & Fabrication", 
  "3D Printing",
  "Casting & Molding",
  "Sheet Metal Work",
  "Assembly Services",
  "Quality Testing",
  "Surface Treatment"
];

const locations = [
  "Mumbai", "Delhi", "Bangalore", "Chennai", "Pune", "Hyderabad", "Kolkata", "Ahmedabad"
];

const sampleJobs = [
  {
    id: 1,
    title: "CNC Precision Machining - Automotive Parts",
    company: "AutoCorp Manufacturing",
    location: "Pune, Maharashtra",
    category: "CNC Machining",
    budget: "₹50,000 - ₹1,00,000",
    deadline: "15 days",
    description: "Required precision CNC machining for 500 automotive components with tight tolerances.",
    skills: ["CNC Programming", "CAD/CAM", "Quality Control"],
    posted: "2 hours ago",
    proposals: 12
  },
  {
    id: 2,
    title: "Welding Services for Industrial Equipment",
    company: "Heavy Industries Ltd",
    location: "Mumbai, Maharashtra", 
    category: "Welding & Fabrication",
    budget: "₹75,000 - ₹1,50,000",
    deadline: "20 days",
    description: "Structural welding and fabrication work for heavy industrial equipment manufacturing.",
    skills: ["Arc Welding", "TIG Welding", "Structural Design"],
    posted: "5 hours ago",
    proposals: 8
  },
  {
    id: 3,
    title: "3D Printing Prototypes - Medical Devices",
    company: "MedTech Innovations",
    location: "Bangalore, Karnataka",
    category: "3D Printing", 
    budget: "₹25,000 - ₹50,000",
    deadline: "10 days",
    description: "Need high-precision 3D printed prototypes for medical device components.",
    skills: ["3D Modeling", "Additive Manufacturing", "Post-Processing"],
    posted: "1 day ago",
    proposals: 15
  }
];

const JobWork = () => {
  const [activeTab, setActiveTab] = useState<"browse" | "post">("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");

  const JobCard = ({ job }: { job: typeof sampleJobs[0] }) => (
    <Card className="bg-card/80 backdrop-blur-sm border-border hover:scale-[1.02] transition-all duration-300">
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <Badge variant="secondary" className="text-xs">
            {job.category}
          </Badge>
          <div className="text-xs text-muted-foreground">{job.posted}</div>
        </div>
        <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Factory className="w-4 h-4 mr-1" />
            {job.company}
          </div>
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-1" />
            {job.location}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">{job.description}</p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {job.skills.map((skill) => (
            <Badge key={skill} variant="outline" className="text-xs">
              {skill}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
          <div className="flex items-center">
            <DollarSign className="w-4 h-4 mr-1 text-success" />
            <span>{job.budget}</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1 text-primary" />
            <span>{job.deadline}</span>
          </div>
          <div className="text-muted-foreground">
            {job.proposals} proposals
          </div>
        </div>

        <Button className="w-full">
          Submit Proposal
        </Button>
      </CardContent>
    </Card>
  );

  const PostJobForm = () => (
    <Card className="bg-card/80 backdrop-blur-sm border-border max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Post a Job</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Job Title</label>
          <Input placeholder="e.g., CNC Machining for Automotive Parts" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {jobCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Budget Range</label>
            <Input placeholder="e.g., ₹50,000 - ₹1,00,000" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Deadline</label>
            <Input placeholder="e.g., 15 days" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Job Description</label>
          <Textarea 
            placeholder="Describe your job requirements in detail..."
            className="min-h-[120px]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Required Skills</label>
          <Input placeholder="e.g., CNC Programming, CAD/CAM, Quality Control" />
        </div>

        <Button className="w-full" size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Post Job
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <section className="py-16 bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-4">Job Work Marketplace</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Outsource your manufacturing needs or find opportunities to grow your business
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-1">
            <Button
              variant={activeTab === "browse" ? "default" : "ghost"}
              onClick={() => setActiveTab("browse")}
              className="px-6"
            >
              <Search className="w-4 h-4 mr-2" />
              Browse Jobs
            </Button>
            <Button
              variant={activeTab === "post" ? "default" : "ghost"}
              onClick={() => setActiveTab("post")}
              className="px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              Post a Job
            </Button>
          </div>
        </div>

        {activeTab === "browse" ? (
          <>
            {/* Search and Filters */}
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-6 mb-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="md:col-span-2"
                />
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {jobCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Job Listings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sampleJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>

            {/* Load More */}
            <div className="text-center mt-8">
              <Button variant="outline" size="lg">
                Load More Jobs
              </Button>
            </div>
          </>
        ) : (
          <PostJobForm />
        )}
      </div>
    </section>
  );
};

export default JobWork;