import { createFileRoute } from "@tanstack/react-router";
import TestImageMigration from "@/pages/TestImageMigration";

export const Route = createFileRoute("/test-image-migration")({
  component: TestImageMigration,
});
