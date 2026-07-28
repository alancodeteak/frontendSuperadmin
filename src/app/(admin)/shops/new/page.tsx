"use client";

import dynamic from "next/dynamic";

import { LoadingState } from "@/components/shared/states";

const CreateShopWizard = dynamic(
  () =>
    import("@/components/shops/create-shop-wizard-form").then(
      (mod) => mod.CreateShopWizard,
    ),
  {
    ssr: false,
    loading: () => <LoadingState label="Loading shop wizard…" />,
  },
);

export default function NewShopPage() {
  return <CreateShopWizard />;
}
