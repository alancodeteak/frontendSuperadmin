"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  POS_AUTH_TYPES,
  type PosAuthType,
} from "@/lib/pos/contract";

export type PosAuthFieldsValue = {
  type: PosAuthType;
  headerName: string;
  tokenUrl: string;
};

export function PosAuthFields({
  value,
  onChange,
  showCredentialsHint,
}: {
  value: PosAuthFieldsValue;
  onChange: (next: PosAuthFieldsValue) => void;
  showCredentialsHint?: string;
}) {
  const needsHeader =
    value.type === "bearer" ||
    value.type === "integration_token" ||
    value.type === "oauth2_client_credentials";
  const needsTokenUrl = value.type === "oauth2_client_credentials";

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Auth type
        </Label>
        <select
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
          value={value.type}
          onChange={(e) =>
            onChange({ ...value, type: e.target.value as PosAuthType })
          }
        >
          {POS_AUTH_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      {needsHeader ? (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Header name
          </Label>
          <Input
            value={value.headerName}
            onChange={(e) => onChange({ ...value, headerName: e.target.value })}
            placeholder={
              value.type === "integration_token"
                ? "X-Integration-Token"
                : "Authorization"
            }
          />
        </div>
      ) : null}
      {needsTokenUrl ? (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            OAuth / login token URL
          </Label>
          <Input
            value={value.tokenUrl}
            onChange={(e) => onChange({ ...value, tokenUrl: e.target.value })}
            placeholder="https://pos.example.com/oauth/token"
          />
          <p className="text-xs text-muted-foreground">
            Seal client_id / client_secret as JSON in credentials. Worker
            refreshes on 401 once.
          </p>
        </div>
      ) : null}
      {showCredentialsHint ? (
        <p className="text-xs text-muted-foreground">{showCredentialsHint}</p>
      ) : null}
    </div>
  );
}
