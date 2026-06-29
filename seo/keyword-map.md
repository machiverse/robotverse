# RobotVerse Keyword Map — Phase 2

_Indian B2B industrial robotics marketplace. Every page targets one primary + 2–4 secondaries. KDI bands per the `semrush-tools-guide`. New-site authority means **focus on KDI < 30** long-tail first; head terms are aspirational._

## Page-type map

| Page type | URL pattern | Primary keyword | Secondary keywords | Notes |
|---|---|---|---|---|
| Home | `/` | industrial robot marketplace India | buy industrial robots India · used industrial robots India · robot trading platform India | Trust + breadth; link out to brand/payload/category pages |
| Robots listing | `/robots` | used industrial robots for sale India | buy industrial robot India · 6 axis robot India · refurbished industrial robot | Faceted nav into brand/payload/application |
| Robot detail | `/robots/:id` *(future: `/robots/:brand-:model-:payloadkg`)* | {Brand} {Model} {payload}kg used industrial robot | {Brand} {Model} for sale India · used {Brand} robot India · {robot_type} {payload}kg | Already implemented in PR head |
| Brand category | `/robots/brand/:brand` | {Brand} industrial robot India | used {Brand} robot India · {Brand} robot price India · buy {Brand} robot India | Exists — needs richer copy + internal links |
| Brand + condition | `/robots/:brand/used` *(proposed)* | used {Brand} robot India | refurbished {Brand} robot · second-hand {Brand} robot India | Net-new route |
| Brand + model | `/robots/:brand/:model` *(proposed)* | {Brand} {Model} for sale | {Brand} {Model} price India · {Brand} {Model} specifications · used {Brand} {Model} | Net-new route |
| Payload category | `/robots/payload/:kg` *(proposed)* | {kg} kg payload industrial robot | {kg} kg robot India · industrial robot {kg} kg | Slice the catalog by payload band |
| Reach category | `/robots/reach/:mm` *(proposed)* | {mm} mm reach industrial robot | {mm}mm reach robot India | Optional, lower volume |
| Application | `/robots/application/:app` *(proposed)* | {application} robot India | {application} automation India · robots for {application} | e.g. welding, palletizing, pick-and-place |
| Type / form-factor | `/robots/type/:type` *(proposed)* | {SCARA / 6-axis / cobot} robot India | {type} robot price India · {type} robot for sale | Maps to existing `robot_type` column |
| City + brand | `/robots/city/:city/:brand` *(proposed, additive on top of `/robots/city/:city`)* | {Brand} robot dealer {city} | used {Brand} robot {city} · {Brand} robot service {city} | Local SEO wedge |
| Spare parts brand | `/parts/brand/:brand` | {Brand} robot spare parts India | {Brand} controller parts · {Brand} teach pendant India | Exists |
| Spare parts category | `/parts/category/:cat` | {category} for industrial robots | {category} India · industrial {category} | Exists |
| Services + city | `/services/:city/:type` | {service type} services {city} | industrial robot {service} {city} · {Brand} robot {service} {city} | Exists |
| RoboBook hub | `/robobook` | industrial robotics guides India | robot buying guide India · industrial automation blog | |
| RoboBook article | `/robobook/:slug` | _per article — see outlines_ | | One primary intent per post |
| Pricing | `/pricing` | seller subscription industrial robot marketplace | list robot for sale India · industrial robot listing platform | Commercial intent |
| Buyer guide | `/buyer-guide` | how to buy used industrial robot India | used robot inspection checklist · used robot import duty India | Top-of-funnel |
| Seller guide | `/seller-guide` | how to sell used industrial robot India | sell FANUC robot India · sell ABB robot India | Top-of-funnel |
| AI Assistant | `/ai-assistant` | AI industrial robot recommender India | find right industrial robot · robot specification comparison AI | Branded utility |

## Brand coverage (India focus)

For each of **FANUC, ABB, KUKA, Yaskawa, Kawasaki, Mitsubishi, Universal Robots, Denso, Stäubli, Comau, Nachi, Epson**, ensure:

1. `/robots/brand/:brand` page exists and is in sitemap.
2. Top 5–10 models surface as separate `/robots/:brand/:model` pages once catalog depth supports it.
3. At least one RoboBook article per brand ("Best Used {Brand} Robots for Indian Factories in 2026") deep-links into the brand page.

## Payload bands (proposed)

`/robots/payload/{slug}` for: `under-5-kg`, `5-10-kg`, `10-20-kg`, `20-50-kg`, `50-100-kg`, `100-kg-plus`. Each page filters the catalog and ranks for `{band} payload industrial robot India`.

## Application clusters (proposed)

`/robots/application/{slug}`: `pick-and-place`, `welding`, `palletizing`, `material-handling`, `machine-tending`, `assembly`, `painting`, `packaging`, `inspection`. Pick-and-place is already validated (KDI very easy in India).

## Migration / safety notes

- **No URL changes shipped in this PR.** Adding brand+model and payload routes is *additive*; existing `/robots/:id` continues to work.
- Eventually rewriting `/robots/:id` from UUID to slug must ship with a 301 redirect from the UUID form (handled in `RobotDetails` via `Navigate` once slugs land in the DB).
- Brand/payload/application pages should be **server-relevant** even with thin catalogs: render the brand intro copy, FAQ, and "We don't currently have X — request alerts" CTA so the page never looks empty.
