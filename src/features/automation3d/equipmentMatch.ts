/**
 * Automation Studio — data for equipment matching: the OEM directory
 * catalogues and live RobotVerse marketplace listings (read-only).
 * Scoring rules are in equipmentScore.ts.
 */

import { supabase } from "@/integrations/supabase/client";
import type { DirRobot, DirTool } from "./equipmentScore";

export * from "./equipmentScore";

/* ----------------------------------------------------------- loaders */

let dirRobots: Promise<DirRobot[]> | null = null;
let dirTools: Promise<DirTool[]> | null = null;
let marketRobots: Promise<Record<string, unknown>[]> | null = null;
let marketTools: Promise<Record<string, unknown>[]> | null = null;

const getJson = <T,>(url: string) => fetch(url).then((r) => (r.ok ? (r.json() as Promise<T[]>) : [])).catch(() => [] as T[]);

export const loadDirectoryRobots = () => (dirRobots ??= getJson<DirRobot>("/directory/robots.json"));
export const loadDirectoryTools = () => (dirTools ??= getJson<DirTool>("/directory/tools.json"));

export const loadMarketRobots = () =>
  (marketRobots ??= Promise.resolve(
    supabase
      .from("robots")
      .select("id, name, brand, model, robot_type, payload_capacity, reach, applications, category_tags, price, currency, condition, location, images, availability")
      .eq("availability", "available")
      .limit(1000),
  ).then(({ data }) => (data ?? []) as Record<string, unknown>[], () => []));

export const loadMarketTools = () =>
  (marketTools ??= Promise.resolve(
    supabase
      .from("spare_parts")
      .select("id, name, brand, model, category, main_category, sub_category, component_type, price, currency, condition, location, images, quantity")
      .gt("quantity", 0)
      .or(
        ["gripper", "vacuum", "suction", "end of arm", "eoat", "torch", "spindle", "tool changer", "nozzle", "applicator", "screwdriver", "camera"]
          .flatMap((w) => [`name.ilike.%${w}%`, `category.ilike.%${w}%`, `sub_category.ilike.%${w}%`])
          .join(","),
      )
      .limit(500),
  ).then(({ data }) => (data ?? []) as Record<string, unknown>[], () => []));

