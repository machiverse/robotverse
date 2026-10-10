import { useLocation } from "react-router-dom";
import { classifyPath } from "../../lib/seo/seoText";
import RobotResourceLinks from "./RobotResourceLinks";

export default function PublicRobotResourceLinks() {
  const { pathname } = useLocation();
  const kind = classifyPath(pathname).kind;
  if (["private", "unknown", "gone"].includes(kind) && pathname !== "/robot-guides" && !pathname.startsWith("/robot-guides/")) return null;
  return <RobotResourceLinks />;
}
