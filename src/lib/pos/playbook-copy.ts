export type PosPlaybookSeverity = "config_only" | "needs_code" | "partial";

export type PosPlaybookStep = {
  title: string;
  detail?: string;
};

export type PosPlaybookField = {
  name: string;
  meaning: string;
};

export type PosPlaybookDef = {
  title: string;
  description?: string;
  steps: PosPlaybookStep[];
  fields?: PosPlaybookField[];
};

export type PosScenarioRow = {
  scenario: string;
  configOnly: string;
  needsCode: string;
  severity: PosPlaybookSeverity;
};

export const POS_SHOP_FIELD_GLOSSARY: PosPlaybookField[] = [
  {
    name: "Template",
    meaning:
      "Which shared POS recipe this shop uses. Change only when switching brands.",
  },
  {
    name: "Vendor base URL",
    meaning:
      "This shop’s POS API host (https://…). Required when we push or sync catalog.",
  },
  {
    name: "Auth type",
    meaning:
      "How we authenticate: none, bearer, integration_token, or oauth2_client_credentials.",
  },
  {
    name: "Credentials",
    meaning:
      "Secret from the vendor (API key or JSON with client_id/client_secret). Stored encrypted. Leave blank to keep the existing secret.",
  },
  {
    name: "Webhook secret",
    meaning:
      "Shared secret so we trust inbound webhooks from this shop’s POS (Lane C).",
  },
  {
    name: "menuTenant / orderTenant",
    meaning:
      "Account + location codes for menu vs order calls. Often the same; sometimes different.",
  },
  {
    name: "Catalog sync",
    meaning: "Pull menu/products from the POS into Yaadro.",
  },
  {
    name: "Order push",
    meaning: "Yaadro sends new/updated orders to the POS.",
  },
  {
    name: "Order pull",
    meaning:
      "POS fetches orders from Yaadro (Saleculator-style). Usually locked by lane.",
  },
  {
    name: "Link active",
    meaning: "Off = stop syncing for this shop without deleting history.",
  },
  {
    name: "Integration token (Features)",
    meaning:
      "One-time token for Saleculator. Create on Features; not stored on the template.",
  },
];

/** Main /pos page — which lane to pick. */
export const POS_LANE_CHOOSER_PLAYBOOK: PosPlaybookDef = {
  title: "Which POS type do I pick?",
  description:
    "Think of a “lane” as the way Yaadro talks to the vendor’s POS. Pick the matching lane first — then configure. If the scenario table below says “needs a developer”, stop and open a ticket instead of forcing a generic template.",
  steps: [
    {
      title: "Cratis (Lane A)",
      detail:
        "Vendor already has a dedicated Cratis connector. Use the seeded Cratis template. Do not clone a generic one.",
    },
    {
      title: "Saleculator (Lane B)",
      detail:
        "The POS pulls orders from Yaadro (we do not push). First enable Integration on the shop Features tab and copy the token. Then attach the Saleculator template.",
    },
    {
      title: "Generic / Gravity / Topas (Lane C)",
      detail:
        "JSON over HTTP that looks like our plug-and-play shape. Edit the template (URLs, auth, field mappings), then attach it per shop.",
    },
    {
      title: "Something else (XML, special signing, new brand)",
      detail:
        "That needs engineering. Check the “When do we need code?” table below before creating templates.",
    },
  ],
  fields: [
    {
      name: "Template",
      meaning:
        "Reusable recipe for one POS brand (URLs, auth style, event triggers, field mappings).",
    },
    {
      name: "Shop link / attach",
      meaning:
        "Connects one shop to one template, with that shop’s URL, password/token, and account/location.",
    },
    {
      name: "Lane",
      meaning:
        "A = dedicated Cratis push, B = Saleculator pull, C = configurable JSON plug-and-play.",
    },
    {
      name: "Connector",
      meaning:
        "The backend code path that actually sends/receives. Locked when the template is created.",
    },
  ],
};

/** Template detail page. */
export const POS_TEMPLATE_DETAIL_PLAYBOOK: PosPlaybookDef = {
  title: "How to configure this template",
  description:
    "Work top to bottom. This page is the shared recipe for every shop that will use this POS. Shop-specific secrets and account numbers are set later on Shop → POS.",
  steps: [
    {
      title: "Check provider, connector, and lane",
      detail:
        "These are locked after create. Wrong pair? Create a new template instead of editing.",
    },
    {
      title: "Decide what this POS can do (capabilities)",
      detail:
        "Catalog sync, push orders out, receive webhooks in, status updates, riders — turn on only what the vendor supports.",
    },
    {
      title: "Choose which Yaadro events trigger a push",
      detail:
        "Only needed when orders or status are pushed out. Example: send when a customer order is created.",
    },
    {
      title: "Set default auth and tenants in the config",
      detail:
        "Auth type (bearer / token / OAuth), header name, and default account/location. Shops can override these on attach.",
    },
    {
      title: "Fill vendor API paths (endpoints)",
      detail:
        "Where to fetch menu, create orders, update status, etc. Skip paths for capabilities that are off.",
    },
    {
      title: "Map webhook fields (order_inbound)",
      detail:
        "Required when the POS sends orders/status into Yaadro. Maps their field names to ours.",
    },
    {
      title: "Test map, then Test connection",
      detail:
        "Paste a sample POS payload into Test map. Optionally test the live URL with a shop_id before attaching shops.",
    },
    {
      title: "Save, then attach shops",
      detail:
        "Only after save is green. Attach from each shop’s POS tab — not from this page.",
    },
  ],
  fields: [
    {
      name: "Name",
      meaning:
        "Stable key for this template (letters, numbers, - or _). Cannot change later.",
    },
    {
      name: "Provider",
      meaning:
        "Which POS brand this recipe is for (cratis, saleculator, generic, gravity, topas).",
    },
    {
      name: "Connector type",
      meaning:
        "Which backend adapter runs (e.g. cratis_push, saleculator_pull, generic_json).",
    },
    {
      name: "Lane",
      meaning: "A / B / C — see main POS page playbook.",
    },
    {
      name: "Version / description",
      meaning: "For your team’s notes. Version helps track config changes.",
    },
    {
      name: "Active",
      meaning:
        "Off = cannot attach to new shops. Existing links keep working until changed.",
    },
    {
      name: "Config JSON",
      meaning:
        "Full recipe: api.baseUrl, api.auth, menuTenant/orderTenant, endpoints, capabilities, events, mappings. Must be valid JSON.",
    },
    {
      name: "api.auth.type",
      meaning:
        "none | bearer | integration_token | oauth2_client_credentials. How Yaadro authenticates to the vendor.",
    },
    {
      name: "api.auth.headerName",
      meaning:
        "HTTP header that carries the token (often Authorization, or X-Integration-Token).",
    },
    {
      name: "api.auth.tokenUrl",
      meaning: "OAuth/login URL used to fetch a short-lived token (oauth2 only).",
    },
    {
      name: "menuTenant / orderTenant",
      meaning:
        "Default account + location codes sent with menu or order calls. Shops usually override these.",
    },
    {
      name: "endpoints.*",
      meaning:
        "HTTP method + path for each action (menu, orderCreate, orderStatus, …).",
    },
    {
      name: "mappings.order_inbound",
      meaning:
        "Rules that turn a vendor webhook body into a Yaadro order. Needed for webhook inbound.",
    },
    {
      name: "Test map",
      meaning:
        "Dry-run: sample vendor JSON → what Yaadro would store. Safe; does not call the vendor.",
    },
    {
      name: "Test connection",
      meaning:
        "Live ping using a shop’s credentials (optional shop_id). Confirms URL/auth work.",
    },
  ],
};

export const POS_TEMPLATE_LANE_CALLOUTS: Record<string, string> = {
  cratis:
    "Lane A — prefer the seeded Cratis profile. Most capability flags are fixed by the server; focus on base URL, auth, and tenants on each shop.",
  saleculator:
    "Lane B — Yaadro does not push orders. Never put the Integration token in this template. Create/rotate the token on Shop → Features, then attach here.",
  generic:
    "Lane C — endpoints + mappings are the main work. Keep a working order_inbound mapping if the POS sends webhooks.",
  gravity:
    "Lane C plug-and-play — configure URLs and mappings. Ask engineering only if the scenario table says “needs a developer”.",
  topas:
    "Lane C plug-and-play — configure URLs and mappings. Ask engineering only if the scenario table says “needs a developer”.",
};

/** Plain-language: when UI is enough vs when to call engineering. */
export const POS_SCENARIO_MATRIX: PosScenarioRow[] = [
  {
    scenario:
      "New shop on an existing Cratis / Saleculator / Gravity / Topas / generic template",
    configOnly: "Yes — attach the template and fill shop URL / tenants / token",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario:
      "Same POS JSON shape, but different website URL, header, or account/location",
    configOnly: "Yes — shop overrides on Shop → POS",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario:
      "Webhook uses different field names; we need to map them to Yaadro fields",
    configOnly: "Yes — edit mappings.order_inbound and use Test map",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario: "Change when we push (e.g. on order created vs accepted)",
    configOnly: "Yes — template events (within the known event list)",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario:
      "Catalog comes from one URL or from separate category/product URLs",
    configOnly: "Yes — capabilities + endpoints (if it is already HTTP JSON)",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario: "Static API key / bearer / integration token in a header",
    configOnly: "Yes — auth type + header name + credentials on shop",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario: "OAuth2 / login that returns a JWT and refreshes after 401",
    configOnly: "Partly — set token URL + seal client id/secret in the UI",
    needsCode:
      "Maybe — first new OAuth vendor may need a quick engineering check",
    severity: "partial",
  },
  {
    scenario: "POS speaks XML, multipart files, or a non-JSON body",
    configOnly: "No",
    needsCode: "Yes — new mapper/adapter",
    severity: "needs_code",
  },
  {
    scenario: "HMAC signatures, mTLS, or a custom challenge handshake",
    configOnly: "No",
    needsCode: "Yes",
    severity: "needs_code",
  },
  {
    scenario:
      "Shop identity must go in a path or body shape we do not support yet",
    configOnly: "No (menuTenant/orderTenant as query is the config path)",
    needsCode: "Yes — connector change",
    severity: "needs_code",
  },
  {
    scenario: "Brand-new POS name that is not in the provider list",
    configOnly: "No",
    needsCode: "Yes — registry + contracts + Super Admin lists",
    severity: "needs_code",
  },
  {
    scenario: "Another “pull orders from Yaadro” POS that is not Saleculator",
    configOnly: "No — do not fake it with generic",
    needsCode: "Yes — new pull connector (or extend Saleculator)",
    severity: "needs_code",
  },
  {
    scenario: "Another brand with Cratis-like special status/body rules",
    configOnly: "No",
    needsCode: "Yes — dedicated connector (Lane A style)",
    severity: "needs_code",
  },
  {
    scenario: "Two POS systems on one shop, or non-HTTP transport",
    configOnly: "No",
    needsCode:
      "Yes — bigger architecture change (out of current hybrid scope)",
    severity: "needs_code",
  },
];

export const POS_SHOP_PLAYBOOK: Record<string, PosPlaybookDef> = {
  cratis: {
    title: "Attach Cratis to this shop",
    description:
      "Lane A — Yaadro pushes orders and can sync catalog. Fill this shop’s URL and account codes; flags are mostly locked.",
    steps: [
      { title: "Select the Cratis template" },
      {
        title: "Enter the vendor base URL",
        detail: "The shop’s Cratis API host from the vendor.",
      },
      {
        title: "Choose auth and paste credentials",
        detail: "Usually bearer + token. Optional custom header name.",
      },
      {
        title: "Set menu and order account / location",
        detail: "Codes the vendor gave you for this branch.",
      },
      {
        title: "Save link → Test connection → try catalog sync / a test order",
      },
    ],
    fields: POS_SHOP_FIELD_GLOSSARY,
  },
  saleculator: {
    title: "Attach Saleculator to this shop",
    description:
      "Lane B — the POS pulls orders from Yaadro. The Integration token lives on Features, not in the template.",
    steps: [
      {
        title: "Go to Features first",
        detail:
          "Enable Integration, create/rotate the token, copy it once, give it to the POS vendor.",
      },
      {
        title: "Come back to this POS tab",
        detail: "Attach is blocked until Integration is enabled.",
      },
      {
        title: "Select the Saleculator template and save",
        detail: "No base URL or push credentials are required for this lane.",
      },
      {
        title: "Confirm the vendor can poll and post status",
      },
    ],
    fields: POS_SHOP_FIELD_GLOSSARY,
  },
  generic: {
    title: "Attach a plug-and-play (Lane C) POS",
    description:
      "Template must already have endpoints and mappings. Here you only set this shop’s URL, auth, and tenants.",
    steps: [
      {
        title: "Confirm the template is ready",
        detail: "Open the template page — endpoints + mappings tested.",
      },
      { title: "Select template → base URL → auth → credentials" },
      {
        title: "Set account / location (menuTenant & orderTenant)",
        detail: "Usually different per shop/branch.",
      },
      {
        title: "Turn on only the flags you need (if unlocked) → Save → Test",
      },
    ],
    fields: POS_SHOP_FIELD_GLOSSARY,
  },
  gravity: {
    title: "Attach Gravity to this shop",
    description:
      "Lane C plug-and-play. Same steps as generic — shop URL, auth, and tenants.",
    steps: [
      { title: "Confirm Gravity template endpoints + mappings are ready" },
      { title: "Select template → base URL → auth → tenants → Save → Test" },
    ],
    fields: POS_SHOP_FIELD_GLOSSARY,
  },
  topas: {
    title: "Attach Topas to this shop",
    description:
      "Lane C plug-and-play. Same steps as generic — shop URL, auth, and tenants.",
    steps: [
      { title: "Confirm Topas template endpoints + mappings are ready" },
      { title: "Select template → base URL → auth → tenants → Save → Test" },
    ],
    fields: POS_SHOP_FIELD_GLOSSARY,
  },
};

export const POS_SHOP_FALLBACK_PLAYBOOK: PosPlaybookDef = {
  title: "Attach POS to this shop",
  description:
    "Pick a template first. The guide updates once a provider is selected. Use Features for Saleculator tokens.",
  steps: [
    { title: "Choose a template that matches the vendor’s lane" },
    { title: "Fill only the fields that appear for that lane" },
    { title: "Save, then use sync status below to confirm health" },
  ],
  fields: POS_SHOP_FIELD_GLOSSARY,
};

export const POS_SHOP_OPERATE_PLAYBOOK: PosPlaybookDef = {
  title: "After the link is live",
  description: "Day-to-day checks once a shop is attached.",
  steps: [
    {
      title:
        "Rotate credentials or the Integration token when the vendor rotates keys",
    },
    {
      title: "Use Sync status on this tab",
      detail:
        "Last sync times and errors tell you if push/pull/catalog is healthy.",
    },
    {
      title: "Detach only when replacing the POS brand",
      detail: "Detaching stops outbox delivery for this shop.",
    },
  ],
};

export const POS_TEMPLATE_DETAIL_STEPS: PosPlaybookStep[] =
  POS_TEMPLATE_DETAIL_PLAYBOOK.steps;

export const POS_GENERAL_LANE_STEPS: PosPlaybookStep[] =
  POS_LANE_CHOOSER_PLAYBOOK.steps;

export const POS_SHOP_OPERATE_STEPS: PosPlaybookStep[] =
  POS_SHOP_OPERATE_PLAYBOOK.steps;
