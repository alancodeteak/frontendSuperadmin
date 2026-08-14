"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PageShell } from "@/components/layout/page-shell";
import { ErrorState, LoadingState, StatusBadge } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  approveCustomerMerge,
  rejectCustomerMerge,
} from "@/lib/api/customer-merges";
import { parseApiFormError } from "@/lib/api-form-error";
import { appToast } from "@/lib/app-toast";
import {
  customerMergeDetailQuery,
  customerMergeKeys,
} from "@/lib/queries/customer-merges";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function JsonBlock({ value }: { value: unknown }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return (
    <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export default function CustomerMergeDetailPage() {
  const params = useParams<{ mergeId: string }>();
  const requestId = params.mergeId;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");

  const query = useQuery(customerMergeDetailQuery(requestId));

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const trimmed = reason.trim();
      if (trimmed.length < 3) {
        throw new Error("Reason must be at least 3 characters.");
      }
      if (action === "approve") {
        return approveCustomerMerge(requestId, trimmed);
      }
      if (action === "reject") {
        return rejectCustomerMerge(requestId, trimmed);
      }
      throw new Error("No action selected.");
    },
    onSuccess: () => {
      appToast.success(
        action === "approve" ? "Merge approved" : "Merge rejected",
      );
      setAction(null);
      setReason("");
      void queryClient.invalidateQueries({ queryKey: customerMergeKeys.all });
      router.push("/customer-merges");
    },
    onError: (error) => {
      const parsed = parseApiFormError(error);
      appToast.error(parsed.message);
    },
  });

  const merge = query.data;
  const canReview = merge?.status === "pending";

  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" render={<Link href="/customer-merges" />}>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Merge request</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review profile impact, conflicts, and audit trail before approving.
          </p>
        </div>
      </div>

      {query.isLoading ? <LoadingState label="Loading merge request…" /> : null}
      {query.isError ? (
        <ErrorState
          message={
            query.error instanceof Error
              ? query.error.message
              : "Could not load merge request"
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}

      {merge ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={merge.status} />
            <span className="font-mono text-xs text-muted-foreground">
              {merge.request_id}
            </span>
            <span className="text-sm text-muted-foreground">
              Shop {merge.shop_id}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Source profile</CardTitle>
                <CardDescription>Profile to merge from</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">ID:</span>{" "}
                  {merge.source_profile_id}
                </p>
                <p>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  {merge.source?.customerName ?? "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Deleted:</span>{" "}
                  {merge.source?.isDeleted ? "Yes" : "No"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Target profile</CardTitle>
                <CardDescription>Survivor profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">ID:</span>{" "}
                  {merge.target_profile_id}
                </p>
                <p>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  {merge.target?.customerName ?? "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Deleted:</span>{" "}
                  {merge.target?.isDeleted ? "Yes" : "No"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Request details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Requested by:</span>{" "}
                {merge.requested_by ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Requested at:</span>{" "}
                {formatDate(merge.created_at)}
              </p>
              <p className="md:col-span-2">
                <span className="text-muted-foreground">Shop reason:</span>{" "}
                {merge.request_reason ?? "—"}
              </p>
              {merge.reviewed_at ? (
                <>
                  <p>
                    <span className="text-muted-foreground">Reviewed by:</span>{" "}
                    {merge.reviewed_by ?? "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Reviewed at:</span>{" "}
                    {formatDate(merge.reviewed_at)}
                  </p>
                  <p className="md:col-span-2">
                    <span className="text-muted-foreground">Review note:</span>{" "}
                    {merge.review_reason ?? "—"}
                  </p>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview snapshot</CardTitle>
              <CardDescription>
                Financial conflicts block approval; balances are never auto-summed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JsonBlock value={merge.preview} />
            </CardContent>
          </Card>

          {merge.audit && merge.audit.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Audit trail</CardTitle>
              </CardHeader>
              <CardContent>
                <JsonBlock value={merge.audit} />
              </CardContent>
            </Card>
          ) : null}

          {canReview ? (
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  setAction("approve");
                  setReason("");
                }}
              >
                Approve merge
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setAction("reject");
                  setReason("");
                }}
              >
                Reject merge
              </Button>
              <Button variant="outline" render={<Link href="/customer-merges" />}>
                Back to list
              </Button>
            </div>
          ) : (
            <Button variant="outline" render={<Link href="/customer-merges" />}>
              Back to list
            </Button>
          )}
        </div>
      ) : null}

      <Dialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAction(null);
            setReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "approve" ? "Approve merge" : "Reject merge"}
            </DialogTitle>
            <DialogDescription>
              Add a review note (minimum 3 characters). This is stored in the
              immutable audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="merge-review-reason">Reason</Label>
            <Textarea
              id="merge-review-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder={
                action === "approve"
                  ? "Verified duplicate profiles; no financial conflicts."
                  : "Profiles are distinct / financial conflict requires manual resolution."
              }
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAction(null);
                setReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant={action === "reject" ? "destructive" : "default"}
              disabled={reviewMutation.isPending || reason.trim().length < 3}
              onClick={() => void reviewMutation.mutate()}
            >
              {reviewMutation.isPending
                ? "Saving…"
                : action === "approve"
                  ? "Confirm approve"
                  : "Confirm reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
