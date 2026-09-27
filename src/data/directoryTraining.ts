// Training courses, programs and workshops listed in the RobotVerse Directory.
// New listings are requested by email (see TrainingDirectory) and added here.
// Keep `link` to official pages you have verified; otherwise leave it out and the
// card offers a web search instead.

export interface TrainingListing {
  id: string; // RobotVerse ID, e.g. RVTrain0001
  title: string;
  provider: string;
  kind: "OEM Academy" | "Online Course" | "Program" | "Workshop";
  mode: "Online" | "Classroom" | "Online + Classroom";
  location: string;
  topics: string[];
  description: string;
  link?: string;
}

export const TRAINING_LISTINGS: TrainingListing[] = [
  {
    id: "RVTrain0001",
    title: "FANUC Robot Operation & Programming",
    provider: "FANUC",
    kind: "OEM Academy",
    mode: "Online + Classroom",
    location: "India & worldwide",
    topics: ["Teach pendant programming", "Maintenance", "ROBOGUIDE simulation"],
    description: "Operator, programming and maintenance courses for FANUC R-30iA/R-30iB controllers, delivered by FANUC training centres.",
  },
  {
    id: "RVTrain0002",
    title: "ABB Robotics Training",
    provider: "ABB",
    kind: "OEM Academy",
    mode: "Online + Classroom",
    location: "India & worldwide",
    topics: ["IRC5 / OmniCore programming", "RobotStudio", "Service"],
    description: "RAPID programming, RobotStudio offline programming and service courses for ABB robots.",
  },
  {
    id: "RVTrain0003",
    title: "KUKA College",
    provider: "KUKA",
    kind: "OEM Academy",
    mode: "Online + Classroom",
    location: "India & worldwide",
    topics: ["KRC4 / KRC5 programming", "Electrical maintenance", "KUKA.Sim"],
    description: "Operating, programming and maintenance training for KUKA robots and controllers.",
  },
  {
    id: "RVTrain0004",
    title: "Yaskawa Motoman Robot Training",
    provider: "Yaskawa",
    kind: "OEM Academy",
    mode: "Classroom",
    location: "India & worldwide",
    topics: ["Programming", "Arc welding applications", "Maintenance"],
    description: "Programming, welding application and maintenance courses for Motoman robots.",
  },
  {
    id: "RVTrain0005",
    title: "Universal Robots Academy",
    provider: "Universal Robots",
    kind: "Online Course",
    mode: "Online + Classroom",
    location: "Online (free modules) + certified partners",
    topics: ["Cobot basics", "PolyScope programming", "Application setup"],
    description: "Free online e-learning modules for UR cobots, plus instructor-led certified training at authorised centres.",
    link: "https://academy.universal-robots.com",
  },
  {
    id: "RVTrain0006",
    title: "RoboDK Academy",
    provider: "RoboDK",
    kind: "Online Course",
    mode: "Online",
    location: "Online",
    topics: ["Robot simulation", "Offline programming", "Post processors"],
    description: "Courses on simulating robot cells and generating robot programs offline for many robot brands.",
    link: "https://robodk.com/academy",
  },
  {
    id: "RVTrain0007",
    title: "Robotic Welding Program",
    provider: "Application training",
    kind: "Program",
    mode: "Classroom",
    location: "India",
    topics: ["Arc & spot welding", "Torch setup", "Weld quality"],
    description: "Hands-on programming of arc and spot welding robots, torch and wire setup, and weld quality checks.",
  },
  {
    id: "RVTrain0008",
    title: "PLC + Robot Integration Workshop",
    provider: "Integrator training",
    kind: "Workshop",
    mode: "Online + Classroom",
    location: "India",
    topics: ["Robot–PLC I/O", "Fieldbus", "Cell safety"],
    description: "Connecting robots to PLCs, I/O and fieldbus communication, and safety for robot cells.",
  },
  {
    id: "RVTrain0009",
    title: "Used Robot Maintenance & Troubleshooting",
    provider: "Service training",
    kind: "Workshop",
    mode: "Classroom",
    location: "India",
    topics: ["Preventive maintenance", "Mastering / calibration", "Alarm recovery"],
    description: "Keeping refurbished robots running: maintenance schedules, mastering, alarms and spare-part replacement.",
  },
];
