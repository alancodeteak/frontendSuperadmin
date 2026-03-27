import { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useParams } from "react-router-dom"

import DashboardLayout from "@/components/layout/DashboardLayout"
import AppSidebar from "@/components/layout/AppSidebar"
import { buildSidebarNav } from "@/components/layout/sidebarNavConfig"

import {
  clearDeliveryPartnerDetail,
  selectDeliveryPartnerDetail,
  selectDeliveryPartnerBlockError,
  selectDeliveryPartnerBlockStatus,
  selectDeliveryPartnerDeleteError,
  selectDeliveryPartnerDeleteStatus,
  selectDeliveryPartnerRestoreError,
  selectDeliveryPartnerRestoreStatus,
} from "@/redux/slices/deliveryPartnersSlice"

import { blockDeliveryPartnerAction, deleteDeliveryPartnerAction, fetchDeliveryPartnerDetailAction, restoreDeliveryPartnerAction } from "@/redux/thunks/deliveryPartnersThunks"

import { logoutLocal } from "@/redux/slices/authSlice"
import { logoutAction } from "@/redux/thunks/authThunks"

import { useTheme } from "@/context/useTheme"
import { getRandomAvatarUrl } from "@/utils/avatarFallback"
import { getRandomBackgroundImage } from "@/utils/backgroundImages"
import ToggleBar from "@/components/common/ToggleBar"
import ConfirmDialog from "@/components/common/ConfirmDialog"



/* ================= HELPERS ================= */

function toDateMaybe(value) {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === "number") {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const raw = String(value).trim()
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatReadableDateTime(value) {
  const d = toDateMaybe(value)
  if (!d) return "null"

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfThatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dayDiff = Math.round((startOfThatDay - startOfToday) / (24 * 60 * 60 * 1000))

  const time = new Intl.DateTimeFormat(undefined, {
    hour12: true,
    hour: "numeric",
    minute: "2-digit",
  }).format(d)
  const timeUpper = time.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase())

  if (dayDiff === 0) return `Today ${timeUpper}`
  if (dayDiff === -1) return `Yesterday ${timeUpper}`

  const date = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(d)

  return `${date} ${timeUpper}`
}

function parseStringifiedJsonArray(value) {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) return value
  if (typeof value !== "string") return null
  const raw = value.trim()
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function formatValue(value) {
  if (value === null || value === undefined) return "null"
  if (typeof value === "boolean") return value ? "true" : "false"
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null"
  if (typeof value === "string") return value.length ? value : "null"
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}



function InfoField({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-white">
        {formatValue(value)}
      </p>
    </div>
  )
}

function TimeInfoField({ label, value }) {
  return <InfoField label={label} value={formatReadableDateTime(value)} />
}

function ImageListField({ label, value }) {
  const list = parseStringifiedJsonArray(value)

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-widest text-slate-400">
        {label}
      </p>
      {list && list.length ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {list.map((src, idx) => (
            <a
              key={`${idx}-${src}`}
              href={String(src)}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-lg border border-slate-700 hover:border-slate-500"
              title="Open image"
            >
              <img
                src={String(src)}
                alt={`${label} ${idx + 1}`}
                className="h-28 w-full object-cover"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-sm font-semibold text-white">
          {formatValue(value)}
        </p>
      )}
    </div>
  )
}

function ImageField({ label, value }) {
  const src = value ? String(value) : ""

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-widest text-slate-400">
        {label}
      </p>

      {src ? (
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block overflow-hidden rounded-lg border border-slate-700 hover:border-slate-500"
          title="Open image"
        >
          <img
            src={src}
            alt={label}
            className="h-40 w-full object-cover"
            loading="lazy"
          />
        </a>
      ) : (
        <p className="mt-1 text-sm font-semibold text-white">
          {formatValue(value)}
        </p>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
        {title}
      </h2>
      {children}
    </div>
  )
}



/* ================= PAGE ================= */

export default function DeliveryPartnerDetailPage() {

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { deliveryPartnerId } = useParams()

  const { themeMode, toggleTheme } = useTheme()

  const detail = useSelector(selectDeliveryPartnerDetail)
  const blockStatus = useSelector(selectDeliveryPartnerBlockStatus)
  const blockError = useSelector(selectDeliveryPartnerBlockError)
  const deleteStatus = useSelector(selectDeliveryPartnerDeleteStatus)
  const deleteError = useSelector(selectDeliveryPartnerDeleteError)
  const restoreStatus = useSelector(selectDeliveryPartnerRestoreStatus)
  const restoreError = useSelector(selectDeliveryPartnerRestoreError)

  const [confirmState, setConfirmState] = useState(null)
  const confirmLoading =
    blockStatus === "loading" || deleteStatus === "loading" || restoreStatus === "loading"

  const { logoutStatus } = useSelector((state) => state.auth)
  const isLoggingOut = logoutStatus === "loading"



  /* ================= FETCH ================= */

  useEffect(() => {

    if (!deliveryPartnerId) return

    dispatch(
      fetchDeliveryPartnerDetailAction({
        delivery_partner_id: deliveryPartnerId,
      })
    )

    return () => dispatch(clearDeliveryPartnerDetail())

  }, [dispatch, deliveryPartnerId])



  /* ================= LOGOUT ================= */

  const handleLogout = async () => {

    if (isLoggingOut) return

    await dispatch(logoutAction())

    dispatch(logoutLocal())

    navigate("/", { replace: true })

  }



  /* ================= SIDEBAR ================= */

  const navSections = useMemo(
    () =>
      buildSidebarNav({
        navigate,
        activeKey: "partners.deliveryPartners",
        paths: {
          dashboardPath: "/dashboard/teamify",
          shopsPath: "/dashboard/teamify/shops",
          createShopPath: "/dashboard/teamify/shops/create",
          deliveryPartnersPath: "/dashboard/teamify/delivery-partners",
          reportsPath: "/dashboard/teamify/reports",
          accountsInvoicesPath: "/dashboard/teamify/accounts/invoices",
          accountsOverviewPath: "/dashboard/teamify/accounts/overview",
        },
      }),
    [navigate]
  )



  /* ================= HEADER DATA ================= */

  const title =
    detail?.name ||
    `${detail?.first_name ?? ""} ${detail?.last_name ?? ""}` ||
    "Delivery Partner"

  const coverImage = useMemo(
    () => getRandomBackgroundImage(),
    []
  )

  const fallbackAvatar = useMemo(
    () => getRandomAvatarUrl(),
    []
  )

  const [avatarOverride, setAvatarOverride] = useState(null)

  const avatarSrc =
    avatarOverride ||
    detail?.photo_url ||
    fallbackAvatar

  const onlineStatusRaw = String(detail?.online_status ?? "").trim().toLowerCase()
  const isOnline =
    onlineStatusRaw === "online" ||
    onlineStatusRaw === "true" ||
    onlineStatusRaw === "1"



  /* ================= UI ================= */

  return (
    <DashboardLayout>

      <AppSidebar
        navSections={navSections}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />



      <main className="flex-1 bg-slate-950">


        {/* BACK BUTTON */}

        <div className="px-8 pt-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() =>
                navigate("/dashboard/teamify/delivery-partners")
              }
              className="rounded-xl border border-slate-600 px-5 py-2 text-sm text-white hover:bg-slate-800"
            >
              ← Back to Listing
            </button>
            <button
              onClick={() =>
                navigate(`/dashboard/teamify/delivery-partners/${deliveryPartnerId}/analytics`)
              }
              className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              View Analytics
            </button>
          </div>

        </div>



        {/* COVER IMAGE */}

        <div className="relative mt-4 h-72 w-full">

          <div
            className="absolute inset-0 rounded-xl"
            style={{
              backgroundImage: `url(${coverImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />

          <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-black/30 via-black/35 to-black/65" />

        </div>



        {/* PROFILE HEADER (FLOATING CARD STYLE) */}

        <div className="relative z-10 mx-auto -mt-20 flex max-w-7xl items-end gap-6 px-8">


          {/* AVATAR */}

          <div className="relative">
            <img
              src={avatarSrc}
              alt={title}
              className="h-40 w-40 rounded-full border-4 border-slate-950 object-cover shadow-lg"
              onError={() =>
                setAvatarOverride(getRandomAvatarUrl())
              }
            />
            <span
              className={`absolute bottom-2 right-2 block h-5 w-5 rounded-full border-2 border-slate-950 ${
                isOnline ? "bg-emerald-500" : "bg-slate-500"
              }`}
              title={isOnline ? "Online" : "Offline"}
            />
          </div>


          {/* NAME */}

          <div className="pb-4">

            <h1 className="text-3xl font-semibold text-white">
              {title}
            </h1>

            <div className="mt-1 flex items-center gap-2">
              <p className="text-slate-400">
                Delivery Partner Profile
              </p>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  isOnline
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                    : "bg-slate-500/20 text-slate-300 ring-1 ring-slate-500/40"
                }`}
                title={isOnline ? "Online" : "Offline"}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isOnline ? "bg-emerald-400" : "bg-slate-300"
                  }`}
                />
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>

          </div>

        </div>



        {/* CONTENT BODY */}

        <div className="mx-auto mt-12 max-w-7xl space-y-6 px-8">

          <ConfirmDialog
            open={Boolean(confirmState)}
            title={confirmState?.title ?? ""}
            message={confirmState?.message ?? ""}
            tone={confirmState?.tone ?? "indigo"}
            confirmText={confirmState?.confirmText ?? "Confirm"}
            cancelText="Cancel"
            loading={confirmLoading}
            onCancel={() => setConfirmState(null)}
            onConfirm={() => {
              const action = confirmState?.action
              setConfirmState(null)
              if (typeof action === "function") action()
            }}
          />


          {/* QUICK STATS */}

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">

            <InfoField label="Rating" value={detail?.rating} />

            <InfoField label="Orders" value={detail?.order_count} />

            <InfoField label="Bonus" value={detail?.total_bonus} />

            <InfoField label="Penalty" value={detail?.total_penalty} />

          </div>

          <Section title="Actions">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ToggleBar
                label="Blocked"
                description="Disable this partner from taking orders."
                checked={Boolean(detail?.is_blocked)}
                disabled={!detail?.delivery_partner_id || confirmLoading}
                onChange={(next) => {
                  if (!detail?.delivery_partner_id) return
                  const id = detail.delivery_partner_id
                  setConfirmState({
                    tone: "indigo",
                    title: next ? "Block delivery partner?" : "Unblock delivery partner?",
                    message: next
                      ? "This partner will be prevented from taking new orders."
                      : "This partner will be allowed to take orders again.",
                    confirmText: next ? "Block" : "Unblock",
                    action: () =>
                      dispatch(
                        blockDeliveryPartnerAction({
                          delivery_partner_id: id,
                          blocked: next,
                        })
                      ),
                  })
                }}
              />

              {Boolean(detail?.is_deleted) ? (
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                  <button
                    type="button"
                    disabled={!detail?.delivery_partner_id || confirmLoading}
                    onClick={() => {
                      if (!detail?.delivery_partner_id) return
                      const id = detail.delivery_partner_id
                      setConfirmState({
                        tone: "indigo",
                        title: "Restore delivery partner?",
                        message:
                          "This will restore the partner back to active (undeleted) state.",
                        confirmText: "Restore",
                        action: () =>
                          dispatch(
                            restoreDeliveryPartnerAction({
                              delivery_partner_id: id,
                            })
                          ),
                      })
                    }}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                      className="opacity-95"
                    >
                      <path
                        d="M3 12a9 9 0 0 1 15.36-6.36"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M18 3v4h-4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M21 12a9 9 0 0 1-15.36 6.36"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M6 21v-4h4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Restore partner
                  </button>
                </div>
              ) : (
                <ToggleBar
                  label="Deleted"
                  description="Soft-delete this partner."
                  checked={false}
                  tone="red"
                  disabled={!detail?.delivery_partner_id || confirmLoading}
                  onChange={(next) => {
                    if (!detail?.delivery_partner_id) return
                    if (!next) return
                    const id = detail.delivery_partner_id
                    setConfirmState({
                      tone: "red",
                      title: "Delete delivery partner?",
                      message:
                        "This will soft-delete the partner. They may disappear from lists and detail fetches depending on backend behavior.",
                      confirmText: "Delete",
                      action: () =>
                        dispatch(
                          deleteDeliveryPartnerAction({
                            delivery_partner_id: id,
                          })
                        ),
                    })
                  }}
                />
              )}
            </div>

            {blockError || deleteError || restoreError ? (
              <p className="text-sm font-semibold text-red-300">
                {(blockError ?? deleteError ?? restoreError)?.message ??
                  "Failed to update delivery partner"}
              </p>
            ) : null}
          </Section>



          {/* PERSONAL DETAILS */}

          <Section title="Personal Details">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

              <InfoField
                label="Delivery Partner ID"
                value={detail?.delivery_partner_id}
              />

              <InfoField
                label="First Name"
                value={detail?.first_name}
              />

              <InfoField
                label="Last Name"
                value={detail?.last_name}
              />

              <InfoField
                label="Email"
                value={detail?.email}
              />

              <InfoField
                label="Phone 1"
                value={detail?.phone1 ?? detail?.phone}
              />

              <InfoField
                label="Phone 2"
                value={detail?.phone2}
              />

              <InfoField
                label="Age"
                value={detail?.age}
              />

            </div>
          </Section>

          <Section title="Shop Details">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <InfoField label="Shop ID" value={detail?.shop_id} />
              <InfoField label="Shop Name" value={detail?.shop_name} />
            </div>
          </Section>

          <Section title="Status & Presence">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <InfoField label="Current Status" value={detail?.current_status} />
              <InfoField label="Online Status" value={detail?.online_status} />
              <InfoField label="Is Blocked" value={detail?.is_blocked} />
              <InfoField label="Is Deleted" value={detail?.is_deleted} />
            </div>
          </Section>

          <Section title="Device & App">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <InfoField label="Device Token" value={detail?.device_token} />
              <InfoField label="Device ID" value={detail?.device_id} />
            </div>
          </Section>

          <Section title="Identity & Documents">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <InfoField label="License No" value={detail?.license_no} />
              <ImageListField label="License Image" value={detail?.license_image} />
              <ImageListField label="Govt ID Image" value={detail?.govt_id_image} />
            </div>
          </Section>

          <Section title="Vehicle">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <InfoField label="Vehicle Detail" value={detail?.vehicle_detail} />
            </div>
          </Section>

          <Section title="Financial">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <InfoField label="Total Bonus" value={detail?.total_bonus} />
              <InfoField label="Total Penalty" value={detail?.total_penalty} />
              <InfoField label="Liquid Cash" value={detail?.liquid_cash} />
            </div>
          </Section>

          <Section title="Timeline">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <TimeInfoField label="Join Date" value={detail?.join_date} />
              <TimeInfoField label="Created At" value={detail?.created_at} />
              <TimeInfoField label="Updated At" value={detail?.updated_at} />
              <TimeInfoField label="Last Login" value={detail?.last_login} />
              <TimeInfoField label="Last Order" value={detail?.last_order} />
            </div>
          </Section>

          <Section title="Photos">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ImageField label="Photo URL" value={detail?.photo_url} />
              <InfoField label="Photo Key" value={detail?.photo} />
            </div>
          </Section>

          


        </div>


      </main>

    </DashboardLayout>
  )
}