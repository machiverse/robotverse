import { useParams } from "react-router-dom";
import ServiceDetails from "./ServiceDetails";
import CityServices from "./landing/CityServices";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// /services/:param resolves to a service detail page for a listing id,
// or to the city services landing page for a city slug.
export default function ServiceRoute() {
  const { id = "" } = useParams<{ id: string }>();
  return UUID_RE.test(id) ? <ServiceDetails /> : <CityServices />;
}
