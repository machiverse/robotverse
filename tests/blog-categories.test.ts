import assert from "node:assert/strict";
import { BLOG_CATEGORIES, blogCategoryOf, blogCategorySlug, detectBlogCategory, GENERAL_CATEGORY } from "../src/utils/blogCategories";

// Typical RoboBook articles land in the category a reader would expect.
const CASES: [string, string, string][] = [
  ["How to Buy a Used FANUC Robot in India: Price Guide 2025", "Buying a refurbished robot can save 40-60% of the price.", "Buying & Selling Robots"],
  ["FANUC SRVO-062 BZAL Alarm: How to Fix the Battery Alarm", "The alarm appears when the encoder battery voltage drops.", "Maintenance & Spare Parts"],
  ["Robotic MIG Welding vs Manual Welding", "Robotic welding gives a consistent bead.", "Welding & Joining"],
  ["Top 5 Cobots for Small Manufacturers", "Collaborative robots work safely next to people.", "Cobots"],
  ["Machine Tending with Robots", "Automating CNC machine tending keeps spindles running.", "Machine Tending & CNC"],
  ["Palletizing Robots: Complete Guide", "End-of-line palletizing robots stack cases on pallets.", "Palletizing & Packaging"],
  ["Introduction to KUKA KRL Programming", "Write your first KRL program on the teach pendant.", "Robot Programming & Software"],
  ["Industrial Robot Market in India to Grow 15% in 2026", "The IFR report shows strong growth.", "Industry News & Trends"],
  ["Robotics Careers: Skills You Need", "Training and certification help you get hired.", "Careers & Training"],
  ["AI-Powered Vision Inspection", "Deep learning cameras detect defects.", "Vision & AI"],
  ["Robot Safety: ISO 10218 Explained", "Risk assessment and light curtains protect operators.", "Safety & Standards"],
  ["How XYZ Auto Cut Cycle Time 30%", "Case study: payback in 18 months.", "Case Studies & ROI"],
  ["Painting Robots for Automotive Bodies", "Rotary bell atomizers give a uniform coating.", "Painting & Finishing"],
  ["ABB vs KUKA: Which Robot Brand Should You Choose?", "We compare reach and payload.", "Robot Guides & Comparisons"],
  ["Gripper selection for pick and place", "Vacuum grippers for assembly lines.", "Assembly & Material Handling"],
  ["Happy Diwali from RobotVerse", "Wishing all our customers a happy festive season.", GENERAL_CATEGORY],
];
for (const [title, content, want] of CASES) assert.equal(detectBlogCategory({ title, content }), want, title);

// Short keywords only match whole words ("ai" not in "maintain", "arc" not in "search").
assert.equal(detectBlogCategory({ title: "Search tips to maintain your account", content: "" }), GENERAL_CATEGORY);

// The author's own category wins; variants map to the standard name.
assert.equal(blogCategoryOf({ category: "welding", title: "Cobots" }), "Welding & Joining");
assert.equal(blogCategoryOf({ category: "automation tips" }), "Automation Tips");
assert.equal(blogCategoryOf({ category: "  ", tags: null, title: "Cobot guide", content: "collaborative cobot" }), "Cobots");
assert.equal(blogCategoryOf({ category: null, tags: null, title: null, content: null }), GENERAL_CATEGORY);

assert.equal(blogCategorySlug("Welding & Joining"), "welding-and-joining");
assert.equal(new Set(BLOG_CATEGORIES.map((c) => c.name)).size, BLOG_CATEGORIES.length);
console.log(`blog categories: ${BLOG_CATEGORIES.length} categories, ${CASES.length} sample posts classified`);
