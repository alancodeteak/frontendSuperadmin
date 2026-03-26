import { useEffect, useMemo, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useParams } from "react-router-dom"

import DashboardLayout from "@/components/layout/DashboardLayout"
import AppSidebar from "@/components/layout/AppSidebar"
import { buildSidebarNav } from "@/components/layout/sidebarNavConfig"

import {
  clearDeliveryPartnerDetail,
  selectDeliveryPartnerDetail,
} from "@/redux/slices/deliveryPartnersSlice"

import { fetchDeliveryPartnerDetailAction } from "@/redux/thunks/deliveryPartnersThunks"

import { logoutLocal } from "@/redux/slices/authSlice"
import { logoutAction } from "@/redux/thunks/authThunks"

import { useTheme } from "@/context/useTheme"
import { getRandomAvatarUrl } from "@/utils/avatarFallback"
import { getRandomBackgroundImage } from "@/utils/backgroundImages"



/* ================= HELPERS ================= */

function formatValue(value) {
  if (!value) return "—"
  return String(value)
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



/* ================= PAGE ================= */

export default function DeliveryPartnerDetailPage() {

  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { deliveryPartnerId } = useParams()

  const { themeMode, toggleTheme } = useTheme()

  const detail = useSelector(selectDeliveryPartnerDetail)

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

          <button
            onClick={() =>
              navigate("/dashboard/teamify/delivery-partners")
            }
            className="rounded-xl border border-slate-600 px-5 py-2 text-sm text-white hover:bg-slate-800"
          >
            ← Back to Listing
          </button>

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

        </div>



        {/* PROFILE HEADER (FLOATING CARD STYLE) */}

        <div className="relative z-10 mx-auto -mt-20 flex max-w-7xl items-end gap-6 px-8">


          {/* AVATAR */}

          <img
            src={avatarSrc}
            alt={title}
            className="h-40 w-40 rounded-full border-4 border-slate-950 object-cover shadow-lg"
            onError={() =>
              setAvatarOverride(getRandomAvatarUrl())
            }
          />


          {/* NAME */}

          <div className="pb-4">

            <h1 className="text-3xl font-semibold text-white">
              {title}
            </h1>

            <p className="text-slate-400">
              Delivery Partner Profile
            </p>

          </div>

        </div>



        {/* CONTENT BODY */}

        <div className="mx-auto mt-12 max-w-7xl space-y-6 px-8">


          {/* QUICK STATS */}

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">

            <InfoField label="Rating" value={detail?.rating} />

            <InfoField label="Orders" value={detail?.order_count} />

            <InfoField label="Bonus" value={detail?.total_bonus} />

            <InfoField label="Penalty" value={detail?.total_penalty} />

          </div>



          {/* PERSONAL DETAILS */}

          <div className="space-y-3">

            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
              Personal Details
            </h2>

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
                label="Phone"
                value={detail?.phone}
              />

            </div>

          </div>


        </div>


      </main>

    </DashboardLayout>
  )
}