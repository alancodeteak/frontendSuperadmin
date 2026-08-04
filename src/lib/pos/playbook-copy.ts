export type PosPlaybookSeverity = "config_only" | "needs_code" | "partial";

export type PosPlaybookStep = {
  title: string;
  detail?: string;
};

export type PosPlaybookField = {
  name: string;
  meaning: string;
  /** Where the user finds this on screen */
  where?: string;
  /** Plain steps to fill it */
  howToFill: string;
  /** Concrete example value */
  example: string;
  /** Another common variant */
  exampleAlt?: string;
  /** When a fresh user should change it */
  whenToChange: string;
  commonMistakes?: string;
};

export type PosPlaybookExample = {
  title: string;
  situation: string;
  whatToDo: string;
  values: { field: string; value: string }[];
};

export type PosPlaybookFaq = {
  q: string;
  a: string;
};

export type PosPlaybookDef = {
  title: string;
  description?: string;
  steps: PosPlaybookStep[];
  fields?: PosPlaybookField[];
  examples?: PosPlaybookExample[];
  faqs?: PosPlaybookFaq[];
};

export type PosScenarioRow = {
  scenario: string;
  configOnly: string;
  needsCode: string;
  severity: PosPlaybookSeverity;
};

/** Shared shop attach field explanations (fresh-user depth). */
export const POS_SHOP_FIELD_GLOSSARY: PosPlaybookField[] = [
  {
    name: "Template",
    meaning:
      "The shared POS recipe (URLs, mappings, events) this shop will use. Every shop on the same brand usually shares one template.",
    where: "Shop → POS → Template dropdown",
    howToFill:
      "Open the dropdown and pick the template whose provider matches the vendor (cratis, saleculator, gravity, topas, or generic). Name often looks like cratis-v1.",
    example: "cratis-v1",
    exampleAlt: "gravity-uae-v1",
    whenToChange:
      "Only when switching POS brand or when ops created a new template version for a different API shape.",
    commonMistakes:
      "Picking generic for Cratis/Saleculator. Always use the dedicated template for those lanes.",
  },
  {
    name: "Vendor base URL",
    meaning:
      "The website address of this shop’s POS API. Yaadro calls this host to push orders or pull the menu.",
    where: "Shop → POS → Vendor base URL",
    howToFill:
      "Ask the vendor for the API base (usually starts with https://). Paste the full host without a trailing path like /orders — paths live on the template.",
    example: "https://pos.cratis.example.com",
    exampleAlt: "https://api.gravity-pos.ae",
    whenToChange:
      "Every shop usually has its own URL, or at least its own subdomain. Change when the vendor gives a new host.",
    commonMistakes:
      "Putting the full order path here (e.g. …/api/orders). Use only the host; keep paths on the template endpoints.",
  },
  {
    name: "Auth type",
    meaning: "How Yaadro proves identity when calling the POS.",
    where: "Shop → POS → Auth type (or template api.auth.type)",
    howToFill:
      "Ask the vendor: static API token → bearer or integration_token; OAuth login → oauth2_client_credentials; public/no auth → none.",
    example: "bearer",
    exampleAlt: "oauth2_client_credentials",
    whenToChange:
      "When the vendor changes how they authenticate (e.g. from API key to OAuth).",
    commonMistakes:
      "Using integration_token on Cratis push, or bearer on Saleculator pull. Saleculator uses Features Integration token, not this field for pull.",
  },
  {
    name: "Header name",
    meaning: "HTTP header that carries the token when we call the POS.",
    where: "Shop overrides / template api.auth.headerName",
    howToFill:
      "If vendor says “put the key in Authorization”, leave Authorization. If they say X-Api-Key or X-Integration-Token, type that exact name.",
    example: "Authorization",
    exampleAlt: "X-Integration-Token",
    whenToChange: "Only when the vendor documentation names a different header.",
    commonMistakes:
      "Changing the header without changing auth type. The pair must match vendor docs.",
  },
  {
    name: "Credentials",
    meaning:
      "Secret password/token from the vendor. Stored encrypted. Used at send time (not frozen forever in the outbox).",
    where: "Shop → POS → Credentials (plaintext)",
    howToFill:
      "For bearer: paste the API key string, or JSON like {\"token\":\"…\"} if your team’s convention is JSON. For OAuth: paste {\"client_id\":\"…\",\"client_secret\":\"…\"}. Leave blank to keep the existing secret.",
    example: '{"token":"sk_live_abc123"}',
    exampleAlt: '{"client_id":"yaadro-app","client_secret":"s3cret"}',
    whenToChange: "When the vendor rotates keys, or first attach.",
    commonMistakes:
      "Putting Saleculator Integration token here. That token is created on Features and given to the POS vendor.",
  },
  {
    name: "Webhook secret",
    meaning:
      "Shared password so Yaadro trusts inbound webhooks from this shop’s POS (Lane C).",
    where: "Shop → POS → Webhook secret",
    howToFill:
      "Agree a long random string with the vendor (min 8 chars). Configure the same value on their webhook settings.",
    example: "whsec_shop42_gravity_9f3a",
    whenToChange: "If you suspect the secret leaked, or vendor asks to rotate.",
    commonMistakes: "Leaving it empty when the POS sends signed/secret webhooks.",
  },
  {
    name: "menuTenant.account / location",
    meaning:
      "Branch codes the POS uses when we fetch the menu/catalog for this shop.",
    where: "Shop config override or template api.menuTenant",
    howToFill:
      "Copy account and location exactly from the vendor’s portal for this branch. Often same as orderTenant.",
    example: 'account = "ACC001", location = "DXB-MARINA"',
    exampleAlt: 'account = "10045", location = "LOC-12"',
    whenToChange: "Per shop/branch. Wrong codes → empty or wrong menu.",
    commonMistakes: "Using demo codes from the template on a live shop.",
  },
  {
    name: "orderTenant.account / location",
    meaning:
      "Branch codes sent with order push/status so the POS knows which store the order belongs to.",
    where: "Shop config override or template api.orderTenant",
    howToFill:
      "Same as menuTenant unless the vendor gave separate order codes. Paste exactly (case-sensitive).",
    example: 'account = "ACC001", location = "DXB-MARINA"',
    whenToChange: "Per shop. Change if orders land in the wrong store on the POS.",
    commonMistakes: "Updating menuTenant but forgetting orderTenant (or the reverse).",
  },
  {
    name: "Catalog sync",
    meaning: "On = Yaadro periodically/on-demand pulls menu from the POS.",
    where: "Shop → POS → Catalog sync checkbox",
    howToFill:
      "Turn on only if the vendor supports catalog pull and the template has menu endpoints. Lane presets may lock this.",
    example: "On for Cratis; Off for Saleculator",
    whenToChange: "When you start/stop using POS as the menu source of truth.",
    commonMistakes: "Enabling on Saleculator (pull-orders lane) — usually locked off.",
  },
  {
    name: "Order push",
    meaning: "On = Yaadro sends new/updated orders to the POS.",
    where: "Shop → POS → Order push checkbox",
    howToFill: "On for Cratis / Lane C push. Off for Saleculator (they pull from us).",
    example: "On for Cratis",
    whenToChange: "Almost never manually on locked lanes; server preset decides.",
    commonMistakes: "Turning push on for Saleculator.",
  },
  {
    name: "Order pull",
    meaning: "On = POS is allowed to fetch orders from Yaadro (Saleculator-style).",
    where: "Shop → POS → Order pull checkbox",
    howToFill: "On for Saleculator. Off for push lanes.",
    example: "On for Saleculator",
    whenToChange: "Locked by lane in most cases.",
    commonMistakes: "Expecting Yaadro to push when only pull is on.",
  },
  {
    name: "Link active",
    meaning: "Master switch for this shop’s POS link.",
    where: "Shop → POS → Link active",
    howToFill: "Keep On for live shops. Turn Off to pause sync without deleting the link.",
    example: "On",
    whenToChange: "Pause during vendor outages or before cutover.",
  },
  {
    name: "Integration token (Features tab)",
    meaning:
      "One-time token Saleculator uses to call Yaadro. Not stored on the POS template.",
    where: "Shop → Features → Integration → Create / rotate token",
    howToFill:
      "Enable Integration, create token, copy immediately, send securely to the POS vendor. Then attach Saleculator on the POS tab.",
    example: "mock-token-shopId-1710000000 (shown once)",
    whenToChange: "When vendor loses the token or you rotate for security.",
    commonMistakes:
      "Looking for the token on the POS tab or inside template JSON — it is only on Features.",
  },
];

export const POS_TEMPLATE_FIELD_GLOSSARY: PosPlaybookField[] = [
  {
    name: "Name",
    meaning: "Stable ID of the template. Used in lists and attach dropdowns.",
    where: "Create dialog (locked after create)",
    howToFill:
      "Use lowercase letters, numbers, hyphen or underscore. No spaces. Pick a name you can recognize in 6 months.",
    example: "cratis-v1",
    exampleAlt: "gravity-marina-v2",
    whenToChange: "Never after create — clone/create a new template instead.",
    commonMistakes: "Spaces or special characters → create fails validation.",
  },
  {
    name: "Provider + Connector + Lane",
    meaning:
      "Provider = brand. Connector = which backend code runs. Lane = A (Cratis), B (Saleculator), C (JSON plug-and-play).",
    where: "Create dialog / read-only on template page",
    howToFill:
      "Match vendor: Cratis→cratis, Saleculator→saleculator, similar JSON→generic/gravity/topas. Connector is auto-suggested from provider.",
    example: "provider=gravity, connector=generic_json, lane=C",
    whenToChange: "Cannot change after create. Wrong pair → new template.",
  },
  {
    name: "Config JSON → api.baseUrl",
    meaning: "Default POS host for shops that do not override URL.",
    where: "Template → Config JSON",
    howToFill:
      "Set a placeholder https host for docs, or leave for shops to override. Prefer shop-level URL for real shops.",
    example: '"baseUrl": "https://pos-vendor.example.com"',
    whenToChange: "When all shops share one host; otherwise override per shop.",
  },
  {
    name: "Config JSON → api.auth",
    meaning: "Default auth for outbound calls.",
    where: "Template → Config JSON → api.auth",
    howToFill:
      'Set "type" to bearer | integration_token | oauth2_client_credentials | none. Add "headerName" when needed. Add "tokenUrl" for OAuth.',
    example:
      '{"type":"bearer","headerName":"Authorization"}',
    exampleAlt:
      '{"type":"oauth2_client_credentials","headerName":"Authorization","tokenUrl":"https://pos.example.com/oauth/token"}',
    whenToChange: "When the vendor’s auth method changes for all shops on this template.",
    commonMistakes: "Sealing secrets in the template for Saleculator Integration — use Features instead.",
  },
  {
    name: "Config JSON → menuTenant / orderTenant",
    meaning: "Default account/location if the shop does not override.",
    where: "Template → Config JSON",
    howToFill:
      'Use demo-looking codes in the template. Real shops must override on attach.\n{"account":"ACC001","location":"LOC001"}',
    example: '{"account":"ACC001","location":"LOC001"}',
    whenToChange: "Defaults only; always set real values on the shop.",
  },
  {
    name: "Config JSON → endpoints",
    meaning: "HTTP method + path for each action (menu, orderCreate, …).",
    where: "Template → Config JSON → endpoints",
    howToFill:
      "Copy paths from vendor API docs. Only fill endpoints for capabilities you enable.",
    example:
      '{"orderCreate":{"method":"POST","path":"/api/orders"}}',
    exampleAlt:
      '{"menu":{"method":"GET","path":"/api/menu"},"menuCategories":{"method":"GET","path":"/api/menu/categories"}}',
    whenToChange: "When vendor changes API paths, or you switch combined vs split menu.",
  },
  {
    name: "Config JSON → capabilities",
    meaning: "What this POS can do: catalog, orders_out, orders_in, status, riders.",
    where: "Template → Config JSON → capabilities",
    howToFill:
      "Set each to the mode the vendor supports (e.g. catalog: pull | none, orders_out: push | none, orders_in: webhook | none).",
    example:
      '{"catalog":"pull","orders_out":"push","orders_in":"webhook"}',
    whenToChange: "When the vendor enables a new feature (e.g. starts sending webhooks).",
  },
  {
    name: "Config JSON → events",
    meaning: "Which Yaadro events trigger a POS push.",
    where: "Template → Config JSON → events",
    howToFill:
      "List event names under order_create_on / status_out_on only if push is enabled. Start with customer_order_created.",
    example:
      '{"order_create_on":["customer_order_created"]}',
    whenToChange: "When ops wants push on accept/dispatch instead of create.",
  },
  {
    name: "Config JSON → mappings.order_inbound",
    meaning:
      "Rules that translate a vendor webhook JSON into Yaadro’s order fields.",
    where: "Template → Config JSON → mappings.order_inbound",
    howToFill:
      "For each Yaadro field, point to the vendor path. Use Test map with a real sample payload until every required field maps.",
    example:
      '{"externalOrderId":"$.order.id","status":"$.order.state","lines":"$.order.items"}',
    whenToChange:
      "Whenever the vendor renames webhook fields or adds required data.",
    commonMistakes: "Leaving starter mapping unchanged while vendor payload differs → inbound fails.",
  },
  {
    name: "Test map",
    meaning: "Safe dry-run: paste vendor JSON → see what Yaadro would store.",
    where: "Template page → Test map button",
    howToFill:
      "Ask vendor for one sample webhook body. Paste into Test map for order_inbound. Fix mappings until output looks right.",
    example: "Sample: {\"order\":{\"id\":\"P-99\",\"state\":\"NEW\",\"items\":[…]}}",
    whenToChange: "Re-run after every mapping edit.",
  },
  {
    name: "Test connection",
    meaning: "Live call to the vendor using a shop’s URL/credentials.",
    where: "Template page → endpoint select + Test",
    howToFill:
      "Pick an endpoint key (e.g. menu or orderCreate), optionally pass shop_id, click Test. Fix URL/auth if it fails.",
    example: "endpoint=menu, shop_id=<uuid of a test shop>",
    whenToChange: "Before attaching production shops.",
  },
];

const LANE_EXAMPLES: PosPlaybookExample[] = [
  {
    title: "New Cratis shop (UI only)",
    situation: "Vendor is Cratis. Template cratis-v1 already exists.",
    whatToDo:
      "Do not create a new template. Open the shop → POS, attach cratis-v1, fill URL + bearer + tenants, save, test.",
    values: [
      { field: "Template", value: "cratis-v1" },
      { field: "Vendor base URL", value: "https://api.cratis.example.com" },
      { field: "Auth type", value: "bearer" },
      { field: "Credentials", value: '{"token":"cratis-shop-key"}' },
      { field: "orderTenant", value: 'account=ACC778 location=DXB-01' },
      { field: "Order push", value: "On (usually locked on)" },
    ],
  },
  {
    title: "New Saleculator shop (UI only)",
    situation: "POS pulls orders from Yaadro.",
    whatToDo:
      "Features → enable Integration → create token → copy to vendor. Then POS tab → attach saleculator template. No base URL needed.",
    values: [
      { field: "Features → Integration", value: "Enabled" },
      { field: "Integration token", value: "(copy once, give to vendor)" },
      { field: "Template", value: "saleculator-v1" },
      { field: "Order pull", value: "On" },
      { field: "Order push / Catalog", value: "Off" },
    ],
  },
  {
    title: "Gravity shop, same JSON as template (UI only)",
    situation: "New branch; same Gravity API shape, different URL and location.",
    whatToDo:
      "Reuse gravity template. Only override shop URL + tenants (+ credentials if different).",
    values: [
      { field: "Template", value: "gravity-v1" },
      { field: "Vendor base URL", value: "https://branch2.gravity.example.com" },
      { field: "menuTenant / orderTenant", value: "ACC001 / BR-02" },
      { field: "Webhook secret", value: "agree with vendor, same on both sides" },
    ],
  },
  {
    title: "Vendor renamed webhook fields (UI only)",
    situation: "Inbound mapping broke after POS upgrade.",
    whatToDo:
      "Open template → edit mappings.order_inbound → Test map with new sample → Save. No shop re-attach if URL/auth unchanged.",
    values: [
      {
        field: "mappings.order_inbound.externalOrderId",
        value: "was $.order.id → now $.payload.orderCode",
      },
      { field: "Test map", value: "Paste new sample until mapped output is complete" },
    ],
  },
  {
    title: "XML / HMAC / brand-new POS (needs developer)",
    situation: "Vendor is not JSON HTTP, or not in the provider list.",
    whatToDo:
      "Stop. Do not invent a generic template. Open engineering ticket with vendor docs. See Scenarios table on main POS page.",
    values: [
      { field: "Super Admin action", value: "None for connector work" },
      { field: "Ticket should include", value: "sample payloads, auth docs, sandbox URL" },
    ],
  },
];

const LANE_FAQS: PosPlaybookFaq[] = [
  {
    q: "I am new — where do I start?",
    a: "1) Read Overview. 2) Find your vendor in Examples. 3) If it says UI only, open the matching template or shop POS tab and copy the example values. 4) If it says needs developer, stop and ticket eng.",
  },
  {
    q: "Template vs shop — what goes where?",
    a: "Template = shared recipe (paths, mappings, events). Shop = this branch’s URL, secrets, account/location. Never put one shop’s password in the shared template if other shops share it.",
  },
  {
    q: "Why did create template fail?",
    a: "Name must be letters/numbers/-/_ only. Provider/connector pair must be allowed (e.g. saleculator + pull connector).",
  },
  {
    q: "Orders not reaching POS?",
    a: "Check link active, order push on, base URL, credentials, orderTenant, and Sync status errors on the shop POS tab.",
  },
];

/** Main /pos page */
export const POS_LANE_CHOOSER_PLAYBOOK: PosPlaybookDef = {
  title: "POS beginner guide — pick a lane & fill values",
  description:
    "Use the page buttons inside this guide: Overview → Steps → Fields & values → Examples → FAQ. Start with Examples if you already know the vendor name.",
  steps: [
    {
      title: "Identify the vendor",
      detail: "Cratis, Saleculator, Gravity, Topas, or “other JSON HTTP”.",
    },
    {
      title: "Open Examples page in this guide",
      detail: "Copy the example field values for that situation.",
    },
    {
      title: "If “needs developer” — stop",
      detail: "Do not create a fake generic template. Use the Scenarios panel below.",
    },
    {
      title: "Otherwise configure template (if new recipe) then attach shop",
      detail: "Template page for mappings/endpoints; Shop → POS for URL/secrets/tenants.",
    },
  ],
  fields: [
    {
      name: "Lane A — Cratis",
      meaning: "Dedicated push + catalog connector.",
      howToFill: "Use seeded cratis template. Attach per shop with URL + bearer + tenants.",
      example: "Template cratis-v1 + shop URL https://…",
      whenToChange: "N/A — always Cratis template for Cratis vendors.",
    },
    {
      name: "Lane B — Saleculator",
      meaning: "POS pulls orders from Yaadro.",
      howToFill: "Features token first, then attach saleculator template.",
      example: "Integration enabled + token copied to vendor",
      whenToChange: "Only for Saleculator-style pull vendors (not generic).",
    },
    {
      name: "Lane C — generic / gravity / topas",
      meaning: "Configurable JSON HTTP plug-and-play.",
      howToFill:
        "Edit template endpoints + mappings, Test map, then attach shops with URL/auth/tenants.",
      example: "gravity-v1 template + shop overrides",
      whenToChange: "When vendor JSON shape is close to our mapping engine.",
    },
    ...POS_SHOP_FIELD_GLOSSARY.slice(0, 4),
  ],
  examples: LANE_EXAMPLES,
  faqs: LANE_FAQS,
};

/** Template detail page */
export const POS_TEMPLATE_DETAIL_PLAYBOOK: PosPlaybookDef = {
  title: "Template config guide — fields, values, examples",
  description:
    "This page edits the shared recipe. Use the buttons: Overview, Steps, Fields & values (with examples), Examples by scenario, FAQ. Shop secrets belong on Shop → POS, not here.",
  steps: [
    {
      title: "Confirm provider / connector / lane (read-only)",
      detail: "Wrong? Create a new template — do not force JSON.",
    },
    {
      title: "Open Fields & values page",
      detail: "Fill config JSON keys using the examples (auth, tenants, endpoints, mappings).",
    },
    {
      title: "Set capabilities + events",
      detail: "Only enable what the vendor supports; start order_create_on with customer_order_created.",
    },
    {
      title: "Edit mappings.order_inbound if webhooks are on",
      detail: "Paste vendor sample into Test map until required fields appear.",
    },
    {
      title: "Save → Test connection with a test shop_id → then attach real shops",
    },
  ],
  fields: POS_TEMPLATE_FIELD_GLOSSARY,
  examples: [
    {
      title: "First-time Gravity template",
      situation: "New Lane C vendor, JSON HTTP, webhooks + order push.",
      whatToDo:
        "Create template provider=gravity. Edit config: baseUrl placeholder, bearer auth, endpoints, capabilities, starter order_inbound. Test map. Save.",
      values: [
        {
          field: "api.auth",
          value: '{"type":"bearer","headerName":"Authorization"}',
        },
        {
          field: "endpoints.orderCreate",
          value: '{"method":"POST","path":"/v1/orders"}',
        },
        {
          field: "capabilities",
          value: '{"orders_out":"push","orders_in":"webhook","catalog":"none"}',
        },
        {
          field: "events.order_create_on",
          value: '["customer_order_created"]',
        },
        {
          field: "mappings.order_inbound",
          value: "Start from seeded mapping; adjust paths to vendor sample",
        },
      ],
    },
    {
      title: "OAuth2 vendor on Lane C",
      situation: "Vendor needs client_id/secret + token URL; refresh on 401.",
      whatToDo:
        "Set auth type oauth2_client_credentials + tokenUrl on template/shop. Seal client JSON in shop credentials. Worker refreshes once on 401.",
      values: [
        {
          field: "api.auth.type",
          value: "oauth2_client_credentials",
        },
        {
          field: "api.auth.tokenUrl",
          value: "https://pos.example.com/oauth/token",
        },
        {
          field: "Shop credentials",
          value: '{"client_id":"…","client_secret":"…"}',
        },
      ],
    },
    {
      title: "Only field names changed on webhook",
      situation: "Existing template; vendor renamed JSON keys.",
      whatToDo: "Edit mappings only. Re-run Test map. No need to change endpoints if paths same.",
      values: [
        {
          field: "mappings.order_inbound",
          value: "Update JSONPath / keys to match new sample",
        },
      ],
    },
    ...LANE_EXAMPLES.filter((e) => e.title.includes("developer")),
  ],
  faqs: [
    {
      q: "Do I put the shop password in config JSON?",
      a: "No for multi-shop templates. Put secrets on Shop → POS credentials. Template holds auth type + header defaults.",
    },
    {
      q: "What does a minimal order_inbound look like?",
      a: "Map at least external order id, status, and line items from the vendor payload. Use Test map — if output misses lines/id, mapping is incomplete.",
    },
    {
      q: "Advanced JSON broke save",
      a: "JSON must be valid (commas, quotes). Copy out, validate in a JSON formatter, paste back.",
    },
    ...LANE_FAQS,
  ],
};

export const POS_TEMPLATE_LANE_CALLOUTS: Record<string, string> = {
  cratis:
    "Lane A — prefer seeded Cratis. Shop page: URL + bearer + tenants. Do not clone generic for Cratis.",
  saleculator:
    "Lane B — Integration token on Features only. Template has no push/catalog. Attach after token exists.",
  generic:
    "Lane C — endpoints + mappings are the main work. Use Fields & values + Test map before attaching shops.",
  gravity:
    "Lane C — same as generic. Shop overrides URL/tenants; template holds paths/mappings.",
  topas:
    "Lane C — same as generic. Shop overrides URL/tenants; template holds paths/mappings.",
};

export const POS_SCENARIO_MATRIX: PosScenarioRow[] = [
  {
    scenario:
      "New shop on an existing Cratis / Saleculator / Gravity / Topas / generic template",
    configOnly: "Yes — attach + URL / tenants / token (see Examples in the guide)",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario:
      "Same POS JSON shape, different URL / header / account-location",
    configOnly: "Yes — shop overrides only",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario: "Webhook field names changed → map to Yaadro fields",
    configOnly: "Yes — mappings.order_inbound + Test map",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario: "Change when we push (created vs accepted)",
    configOnly: "Yes — template events list",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario: "Catalog one URL vs split category/product URLs",
    configOnly: "Yes — capabilities + endpoints (HTTP JSON)",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario: "Static bearer / integration_token header",
    configOnly: "Yes — auth type + headerName + credentials",
    needsCode: "No",
    severity: "config_only",
  },
  {
    scenario: "OAuth2 / login JWT with refresh-on-401",
    configOnly: "Partly — tokenUrl + sealed client JSON in UI",
    needsCode: "Maybe — first new OAuth vendor may need eng check",
    severity: "partial",
  },
  {
    scenario: "XML, multipart, or non-JSON body",
    configOnly: "No",
    needsCode: "Yes — new mapper/adapter",
    severity: "needs_code",
  },
  {
    scenario: "HMAC / mTLS / custom challenge",
    configOnly: "No",
    needsCode: "Yes",
    severity: "needs_code",
  },
  {
    scenario: "Identity in path/body beyond menuTenant/orderTenant query",
    configOnly: "No",
    needsCode: "Yes — connector change",
    severity: "needs_code",
  },
  {
    scenario: "Brand-new POS name not in provider list",
    configOnly: "No",
    needsCode: "Yes — registry + contracts + FE lists",
    severity: "needs_code",
  },
  {
    scenario: "Another pull-from-Yaadro POS (not Saleculator)",
    configOnly: "No — do not fake with generic",
    needsCode: "Yes — new pull connector",
    severity: "needs_code",
  },
  {
    scenario: "Another brand with Cratis-like special rules",
    configOnly: "No",
    needsCode: "Yes — dedicated Lane A-style connector",
    severity: "needs_code",
  },
  {
    scenario: "Multi-POS per shop / non-HTTP transport",
    configOnly: "No",
    needsCode: "Yes — architecture (out of hybrid scope)",
    severity: "needs_code",
  },
];

function shopPlaybook(
  title: string,
  description: string,
  steps: PosPlaybookStep[],
  examples: PosPlaybookExample[],
): PosPlaybookDef {
  return {
    title,
    description,
    steps,
    fields: POS_SHOP_FIELD_GLOSSARY,
    examples,
    faqs: LANE_FAQS,
  };
}

export const POS_SHOP_PLAYBOOK: Record<string, PosPlaybookDef> = {
  cratis: shopPlaybook(
    "Shop POS guide — Cratis (Lane A)",
    "Open guide → use Fields & values and Examples. Fill URL, bearer credentials, and account/location for this branch.",
    [
      { title: "Select Cratis template" },
      {
        title: "Paste vendor base URL",
        detail: "Example: https://api.cratis.example.com",
      },
      {
        title: "Auth = bearer + paste token in Credentials",
        detail: 'Example: {"token":"…"} or raw key per your ops convention',
      },
      {
        title: "Set menuTenant and orderTenant",
        detail: "Exact account + location from vendor for this branch",
      },
      { title: "Save → check Sync status → place a test order" },
    ],
    [LANE_EXAMPLES[0]!],
  ),
  saleculator: shopPlaybook(
    "Shop POS guide — Saleculator (Lane B)",
    "Token first on Features, then attach here. Use Examples page for the exact order of clicks.",
    [
      {
        title: "Features → Integration → create/rotate token → copy once",
      },
      { title: "Give token to POS vendor securely" },
      { title: "Return to POS tab → select Saleculator template → Save" },
      { title: "Confirm vendor can poll orders and post status" },
    ],
    [LANE_EXAMPLES[1]!],
  ),
  generic: shopPlaybook(
    "Shop POS guide — Lane C (generic)",
    "Template must already be tested. Here you only set this shop’s URL, auth, tenants, webhook secret.",
    [
      { title: "Confirm template Test map + endpoints are done" },
      { title: "Select template → base URL → auth → credentials" },
      { title: "Set menuTenant & orderTenant for this branch" },
      { title: "Optional webhook secret → Save → Test / place order" },
    ],
    [LANE_EXAMPLES[2]!, LANE_EXAMPLES[3]!],
  ),
  gravity: shopPlaybook(
    "Shop POS guide — Gravity (Lane C)",
    "Same as generic plug-and-play. Copy values from Examples; override URL and tenants per branch.",
    [
      { title: "Select gravity template" },
      { title: "Set base URL + auth + tenants for this branch" },
      { title: "Save and verify sync / webhook" },
    ],
    [LANE_EXAMPLES[2]!, LANE_EXAMPLES[3]!],
  ),
  topas: shopPlaybook(
    "Shop POS guide — Topas (Lane C)",
    "Same as generic plug-and-play. Copy values from Examples; override URL and tenants per branch.",
    [
      { title: "Select topas template" },
      { title: "Set base URL + auth + tenants for this branch" },
      { title: "Save and verify sync / webhook" },
    ],
    [LANE_EXAMPLES[2]!, LANE_EXAMPLES[3]!],
  ),
};

export const POS_SHOP_FALLBACK_PLAYBOOK: PosPlaybookDef = {
  title: "Shop POS guide — pick a template first",
  description:
    "Select a template in the form below. This guide will switch to Cratis / Saleculator / Lane C with field examples.",
  steps: [
    { title: "Choose a template that matches the vendor" },
    { title: "Re-open Fields & values for that lane’s examples" },
    { title: "Fill only the fields shown for that lane" },
  ],
  fields: POS_SHOP_FIELD_GLOSSARY,
  examples: LANE_EXAMPLES,
  faqs: LANE_FAQS,
};

export const POS_SHOP_OPERATE_PLAYBOOK: PosPlaybookDef = {
  title: "After attach — operate & troubleshoot",
  description:
    "Day-2 tasks: rotate secrets, read sync errors, when to detach. Use Examples if cutover fails.",
  steps: [
    {
      title: "Rotate credentials or Integration token when vendor rotates keys",
    },
    {
      title: "Use Sync status",
      detail: "Last sync times + sync error text are the first place to look.",
    },
    {
      title: "Detach only when replacing POS brand",
      detail: "Stops outbox for this shop.",
    },
  ],
  fields: POS_SHOP_FIELD_GLOSSARY.filter((f) =>
    ["Link active", "Credentials", "Integration token (Features tab)"].includes(
      f.name,
    ),
  ),
  examples: [
    {
      title: "Orders stuck / sync error",
      situation: "Sync status shows auth or tenant error.",
      whatToDo:
        "Re-check base URL, credentials, orderTenant. For 401 after OAuth, confirm tokenUrl + client JSON. Re-save credentials to refresh.",
      values: [
        { field: "Sync error", value: "Read exact message on this tab" },
        { field: "Credentials", value: "Re-paste rotated key, save" },
      ],
    },
  ],
  faqs: LANE_FAQS,
};

export const POS_TEMPLATE_DETAIL_STEPS: PosPlaybookStep[] =
  POS_TEMPLATE_DETAIL_PLAYBOOK.steps;

export const POS_GENERAL_LANE_STEPS: PosPlaybookStep[] =
  POS_LANE_CHOOSER_PLAYBOOK.steps;

export const POS_SHOP_OPERATE_STEPS: PosPlaybookStep[] =
  POS_SHOP_OPERATE_PLAYBOOK.steps;
