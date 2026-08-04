export type PosPlaybookSeverity = "config_only" | "needs_code" | "partial";

export type PosPlaybookStep = {
  title: string;
  detail?: string;
};

export type PosPlaybookDef = {
  title: string;
  description?: string;
  steps: PosPlaybookStep[];
};

export type PosScenarioRow = {
  scenario: string;
  configOnly: string;
  needsCode: string;
  severity: PosPlaybookSeverity;
};

export const POS_GENERAL_LANE_STEPS: PosPlaybookStep[] = [
  {
    title: "Vendor is Cratis",
    detail: "Use the seeded cratis template (Lane A). Do not invent a generic clone.",
  },
  {
    title: "Vendor pulls orders from Yaadro (Saleculator-style)",
    detail: "Use saleculator + Features Integration token (Lane B).",
  },
  {
    title: "Vendor is JSON HTTP push/webhook (Gravity / Topas / generic)",
    detail: "Clone or edit a Lane C template, then attach per shop.",
  },
  {
    title: "Scenario matrix says needs_code",
    detail: "Stop config-only work and open a backend connector ticket.",
  },
];

export const POS_LANE_CHOOSER_PLAYBOOK: PosPlaybookDef = {
  title: "How to choose a lane",
  description:
    "Pick the lane that matches the vendor. Config-only onboarding stays on templates + shop attach; needs-code rows require engineering.",
  steps: POS_GENERAL_LANE_STEPS,
};

export const POS_TEMPLATE_DETAIL_PLAYBOOK: PosPlaybookDef = {
  title: "Configure this template",
  description:
    "Work top-to-bottom, then Test map / Test connection before attaching shops.",
  steps: [
    {
      title: "Confirm provider / connector / lane",
      detail: "Locked after create; wrong pair → create a new template.",
    },
    {
      title: "Set capabilities",
      detail: "catalog / orders_out / orders_in / status_out / status_in / riders.",
    },
    { title: "Set events", detail: "Only for enabled outbound capabilities." },
    {
      title: "Set auth defaults + tenants",
      detail: "Shop can override account/location and headerName.",
    },
    {
      title: "Fill endpoints",
      detail: "menu* if catalog ≠ none; orderCreate if orders_out=push; etc.",
    },
    {
      title: "Edit mappings",
      detail: "order_inbound required when orders_in=webhook.",
    },
    { title: "Test map", detail: "Each mapping section with real sample payloads." },
    { title: "Test connection", detail: "Optional shop_id before attaching shops." },
    { title: "Save", detail: "Only then attach shops from Shop → POS." },
    {
      title: "Advanced JSON",
      detail: "Escape hatch after structured sections — validate before save.",
    },
  ],
};

export const POS_SCENARIO_MATRIX: PosScenarioRow[] = [
  {
    scenario: "New shop on existing Cratis / Saleculator / generic / gravity / topas",
    configOnly: "Yes — attach + credentials/tenants/token",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario: "Same JSON shape, different base URL / header / account-location",
    configOnly: "Yes — shop overrides + auth fields",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario: "New webhook field names → canonical order",
    configOnly: "Yes — mappings.order_inbound (+ Test map)",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario: "Tweak push triggers (order_create_on / status_out_on) within known events",
    configOnly: "Yes — template events",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario: "Catalog pull combined vs split endpoints",
    configOnly: "Yes — capabilities + endpoints (if already pull HTTP JSON)",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario: "Static bearer / integration_token header (incl. custom headerName)",
    configOnly: "Yes — shop/template auth fields",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario: "OAuth2 / login JWT with refresh-on-401",
    configOnly: "Partial — token URL + sealed client secrets in UI",
    needsCode: "Yes — shared PosTokenProvider; first vendor may need credential wiring",
    severity: "partial",
  },
  {
    scenario: "Non-JSON body (XML, multipart, proprietary binary)",
    configOnly: "No",
    needsCode: "Yes — dedicated mapper/adapter",
    severity: "needs_code",
  },
  {
    scenario: "HMAC / request signing / mTLS / custom challenge",
    configOnly: "No",
    needsCode: "Yes",
    severity: "needs_code",
  },
  {
    scenario: "Path/body identity not covered by menuTenant/orderTenant query",
    configOnly: "No",
    needsCode: "Yes — connector-specific",
    severity: "needs_code",
  },
  {
    scenario: "Brand-new provider name not in POS_PROVIDERS / registry",
    configOnly: "No",
    needsCode: "Yes — contracts + POS_CONNECTOR_REGISTRY + VendorRegistry + FE lists",
    severity: "needs_code",
  },
  {
    scenario: "Saleculator-like pull API with different auth/paths",
    configOnly: "No (do not fake via generic)",
    needsCode: "Yes — new pull connector or extend saleculator",
    severity: "needs_code",
  },
  {
    scenario: "Cratis-like quirks (special status/body) on another brand",
    configOnly: "No",
    needsCode: "Yes — new Lane A-style connector",
    severity: "needs_code",
  },
  {
    scenario: "Multi-POS per shop / non-HTTP transport",
    configOnly: "No",
    needsCode: "Yes — architecture change (out of hybrid scope)",
    severity: "needs_code",
  },
];

export const POS_TEMPLATE_DETAIL_STEPS: PosPlaybookStep[] =
  POS_TEMPLATE_DETAIL_PLAYBOOK.steps;

export const POS_TEMPLATE_LANE_CALLOUTS: Record<string, string> = {
  cratis: "Prefer the seeded Cratis profile; capability flags are largely fixed by the lane preset.",
  saleculator:
    "No outbound push/catalog. Do not put the Integration token in template credentials — it comes from shop Features.",
  generic:
    "Mappings + endpoints are the main work. Starter order_inbound is expected when webhook inbound is enabled.",
  gravity:
    "Lane C plug-and-play. Configure endpoints/mappings; request a connector only if the scenario matrix says needs_code.",
  topas:
    "Lane C plug-and-play. Configure endpoints/mappings; request a connector only if the scenario matrix says needs_code.",
};

export const POS_SHOP_PLAYBOOK: Record<
  string,
  { title: string; steps: PosPlaybookStep[] }
> = {
  cratis: {
    title: "Lane A — Cratis attach",
    steps: [
      { title: "Pick Cratis template" },
      { title: "Enter base URL + bearer/auth + headerName if needed" },
      { title: "Set menuTenant / orderTenant account & location" },
      { title: "Flags are locked by server preset — do not fight them" },
      {
        title: "Attach → Test connection → Sync catalog if enabled → verify order push",
      },
    ],
  },
  saleculator: {
    title: "Lane B — Saleculator attach",
    steps: [
      {
        title: "Features tab → enable Integration → create/rotate token → copy once",
        detail: "Prerequisite before attach on this tab.",
      },
      { title: "Return here → Saleculator template (blocked until Integration enabled)" },
      { title: "No base URL / push credentials required for the pull lane" },
      {
        title: "Attach → give token to POS vendor → vendor polls Yaadro; confirm status posts",
      },
    ],
  },
  generic: {
    title: "Lane C — plug-and-play attach",
    steps: [
      { title: "Ensure template already has endpoints + mappings" },
      { title: "Select template → base URL → auth + headerName → tenants" },
      { title: "Enable only needed flags when unlocked" },
      { title: "Attach → Test connection → place test order / fire webhook" },
    ],
  },
  gravity: {
    title: "Lane C — Gravity attach",
    steps: [
      { title: "Ensure template already has endpoints + mappings" },
      { title: "Select template → base URL → auth + headerName → tenants" },
      { title: "Enable only needed flags when unlocked" },
      { title: "Attach → Test connection → place test order / fire webhook" },
    ],
  },
  topas: {
    title: "Lane C — Topas attach",
    steps: [
      { title: "Ensure template already has endpoints + mappings" },
      { title: "Select template → base URL → auth + headerName → tenants" },
      { title: "Enable only needed flags when unlocked" },
      { title: "Attach → Test connection → place test order / fire webhook" },
    ],
  },
};

export const POS_SHOP_OPERATE_STEPS: PosPlaybookStep[] = [
  { title: "Rotate credentials / token when the vendor rotates keys" },
  { title: "Use sync/status panels on this tab for health" },
  {
    title: "Detach only when replacing provider",
    detail: "Warn: breaks outbox for that shop.",
  },
];
