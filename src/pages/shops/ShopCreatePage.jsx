import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import DashboardLayout from '@/components/layout/DashboardLayout'
import AppSidebar from '@/components/layout/AppSidebar'
import { buildSidebarNav } from '@/components/layout/sidebarNavConfig'
import LocationPickerMap from '@/components/shops/LocationPickerMap'
import { logoutLocal } from '@/redux/slices/authSlice'
import { logoutAction } from '@/redux/thunks/authThunks'
import { createSupermarketAction } from '@/redux/thunks/supermarketsThunks'
import { useTheme } from '@/context/useTheme'
import '@/App.css'

const steps = [
  { id: 1, title: 'Shop Account' },
  { id: 2, title: 'Contact & Media' },
  { id: 3, title: 'Address & Geo' },
  { id: 4, title: 'Preferences' },
  { id: 5, title: 'Security & Subscription' },
]

const initialForm = {
  // Step 1
  shop_id: '',
  user_id: '',
  shop_name: '',

  // Step 2
  phone_country: 'IN',
  phone_dial_code: '+91',
  phone_local: '',
  email: '',
  shop_license_no: '',
  contact_person_number: '',
  contact_person_email: '',
  photoFile: null,
  photoPreviewUrl: '',

  // Step 3
  street_address: '',
  city: '',
  state: '',
  pincode: '',
  latitude: '',
  longitude: '',

  // Step 4 (Preferences)
  is_automated: false,
  self_assigned: false,
  is_sms_activated: false,
  whatsapp: false,
  is_supermarket: true,
  single_sms: false,
  is_marketing_enabled: false,

  // Step 5 (Security & Subscription)
  password: '',
  confirm_password: '',
  show_password: false,
  subscription_enabled: false,
  subscription_amount: '',
  subscription_status: 'ACTIVE',
}

function ShopCreatePage({
  brandTitle = 'Teamify',
  sidebarSubTitle = 'Team Dashboard',
  listingPath = '/dashboard/teamify/shops',
  createPath = '/dashboard/teamify/shops/create',
  logoutRedirectTo = '/',
}) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { themeMode, toggleTheme } = useTheme()
  const isDark = themeMode === 'dark'
  const { logoutStatus } = useSelector((state) => state.auth)
  const isLoggingOut = logoutStatus === 'loading'

  const [stepIndex, setStepIndex] = useState(0)
  const [form, setForm] = useState(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [touched, setTouched] = useState(() => ({
    shop_id: false,
    user_id: false,
    shop_name: false,
    phone_local: false,
    shop_license_no: false,
    photoFile: false,
    street_address: false,
    city: false,
    state: false,
    pincode: false,
    latitude: false,
    longitude: false,
    password: false,
    confirm_password: false,
    subscription_amount: false,
    subscription_status: false,
  }))

  const slugify = (value) =>
    String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

  const gen3Digits = () => String(Math.floor(100 + Math.random() * 900))
  const dayMonth = () => {
    const d = new Date()
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    return `${dd}${mm}`
  }

  // Used to animate in step content consistently.
  const stepKeyRef = useRef(0)
  const lastSlugRef = useRef('')

  const handleLogout = async () => {
    if (isLoggingOut) return
    await dispatch(logoutAction())
    dispatch(logoutLocal())
    navigate(logoutRedirectTo, { replace: true })
  }

  const currentStep = steps[stepIndex]

  useEffect(() => {
    return () => {
      if (form.photoPreviewUrl) {
        URL.revokeObjectURL(form.photoPreviewUrl)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const slug = slugify(form.shop_name)
    if (!slug) return
    if (slug === lastSlugRef.current) return
    lastSlugRef.current = slug

    const nextId = `${slug}-${dayMonth()}-${gen3Digits()}`
    const nextLic = `${slug}-lic-${dayMonth()}-${gen3Digits()}`

    setForm((prev) => {
      const patch = { ...prev }
      if (!touched.shop_id) patch.shop_id = nextId
      if (!touched.shop_license_no) patch.shop_license_no = nextLic
      return patch
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.shop_name])

  const errors = useMemo(() => {
    const next = {}

    const required = (key, label) => {
      if (!String(form[key] ?? '').trim()) next[key] = `${label} is required`
    }

    required('shop_id', 'Shop ID')
    required('user_id', 'User ID')
    required('shop_name', 'Shop name')
    required('phone_local', 'Phone')
    required('shop_license_no', 'Shop license no')
    if (!form.photoFile) next.photoFile = 'Photo is required'
    required('street_address', 'Street address')
    required('city', 'City')
    required('state', 'State')
    required('pincode', 'Pincode')
    required('latitude', 'Latitude')
    required('longitude', 'Longitude')

    if (String(form.password ?? '').trim().length < 6) {
      next.password = 'Password must be at least 6 characters'
    }
    if (String(form.confirm_password ?? '').trim().length < 6) {
      next.confirm_password = 'Confirm password must be at least 6 characters'
    }
    if (
      String(form.password ?? '').trim() &&
      String(form.confirm_password ?? '').trim() &&
      form.password !== form.confirm_password
    ) {
      next.confirm_password = 'Passwords do not match'
    }

    if (form.subscription_enabled) {
      if (!String(form.subscription_amount ?? '').trim()) {
        next.subscription_amount = 'Amount is required'
      }
      if (!String(form.subscription_status ?? '').trim()) {
        next.subscription_status = 'Status is required'
      }
    }

    if (photoError) {
      next.photoFile = photoError
    }

    return next
  }, [form, photoError])

  const markTouched = (key) =>
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }))

  const markTouchedMany = (keys) =>
    setTouched((prev) => {
      let changed = false
      const next = { ...prev }
      for (const key of keys) {
        if (!next[key]) {
          next[key] = true
          changed = true
        }
      }
      return changed ? next : prev
    })

  const markCurrentStepTouched = () => {
    if (stepIndex === 0) {
      markTouchedMany(['shop_name', 'shop_id', 'user_id'])
      return
    }
    if (stepIndex === 1) {
      markTouchedMany(['phone_local', 'shop_license_no', 'photoFile'])
      return
    }
    if (stepIndex === 2) {
      markTouchedMany([
        'street_address',
        'city',
        'state',
        'pincode',
        'latitude',
        'longitude',
      ])
      return
    }
    if (stepIndex === 4) {
      const keys = ['password', 'confirm_password']
      if (form.subscription_enabled) keys.push('subscription_amount', 'subscription_status')
      markTouchedMany(keys)
    }
  }

  const showFieldError = (key) => touched[key] && errors[key]

  const isStepValid = useMemo(() => {
    if (stepIndex === 0) {
      return !errors.shop_id && !errors.user_id && !errors.shop_name
    }
    if (stepIndex === 1) {
      return !errors.phone_local && !errors.shop_license_no && !errors.photoFile
    }
    if (stepIndex === 2) {
      return (
        !errors.street_address &&
        !errors.city &&
        !errors.state &&
        !errors.pincode &&
        !errors.latitude &&
        !errors.longitude
      )
    }
    if (stepIndex === 4) {
      return (
        !errors.password &&
        !errors.confirm_password &&
        !errors.subscription_amount &&
        !errors.subscription_status
      )
    }
    return true
  }, [errors, stepIndex])

  const goNext = () => {
    setSubmitError('')
    if (!isStepValid) {
      markCurrentStepTouched()
      setSubmitError('Please fix the highlighted fields.')
      return
    }
    if (stepIndex < steps.length - 1) {
      stepKeyRef.current += 1
      setStepIndex((v) => v + 1)
    }
  }

  const goBack = () => {
    setSubmitError('')
    if (stepIndex > 0) {
      stepKeyRef.current += 1
      setStepIndex((v) => v - 1)
    }
  }

  const submit = async () => {
    if (isSubmitting) return
    if (!isStepValid) {
      markCurrentStepTouched()
      setSubmitError('Please fix the highlighted fields.')
      return
    }
    setIsSubmitting(true)
    setSubmitError('')
    setSubmitSuccess('')
    try {
      const fullPhone = form.phone_local
        ? `${form.phone_dial_code}${String(form.phone_local).replace(/\s+/g, '')}`
        : null
      const payload = {
        user_id: Number(form.user_id),
        shop_name: form.shop_name,
        password: form.password,
        phone: fullPhone,
        email: form.email || null,
        shop_license_no: form.shop_license_no || null,
        // API expects `photo` as string (url/key). Until backend adds upload/presign, keep preview-only.
        photo: null,
        address: {
          street_address: form.street_address,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          latitude: form.latitude ? Number(form.latitude) : null,
          longitude: form.longitude ? Number(form.longitude) : null,
        },
        promotion: {
          is_marketing_enabled: Boolean(form.is_marketing_enabled),
        },
        subscription: form.subscription_enabled
          ? {
              start_date: new Date().toISOString(),
              amount: Number(form.subscription_amount),
              status: String(form.subscription_status || '').toLowerCase(),
            }
          : null,
      }

      await dispatch(createSupermarketAction(payload)).unwrap()
      setSubmitSuccess('Shop created successfully.')
      setTimeout(() => navigate(listingPath, { replace: true }), 700)
    } catch (error) {
      setSubmitError(error?.message ?? 'Failed to create shop. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const navSections = useMemo(
    () =>
      buildSidebarNav({
        navigate,
        activeKey: 'shops.create',
        paths: {
          dashboardPath: listingPath.replace('/shops', ''),
          shopsPath: listingPath,
          createShopPath: createPath,
        },
      }),
    [createPath, listingPath, navigate],
  )

  const update = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const updateBool = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.checked }))

  const toggleBool = (key) => () =>
    setForm((prev) => ({ ...prev, [key]: !prev[key] }))

  const setPhoneCountry = (country) => {
    if (country === 'UAE') {
      setForm((prev) => ({
        ...prev,
        phone_country: 'UAE',
        phone_dial_code: '+971',
      }))
      return
    }
    setForm((prev) => ({
      ...prev,
      phone_country: 'IN',
      phone_dial_code: '+91',
    }))
  }

  const phoneDialDisplay = form.phone_country === 'UAE' ? '🇦🇪 +971' : '🇮🇳 +91'

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0] ?? null
    markTouched('photoFile')
    setPhotoError('')
    if (file && file.size > 5 * 1024 * 1024) {
      setPhotoError('Image must be 5MB or smaller')
      return
    }
    setForm((prev) => {
      if (prev.photoPreviewUrl) {
        URL.revokeObjectURL(prev.photoPreviewUrl)
      }
      return {
        ...prev,
        photoFile: file,
        photoPreviewUrl: file ? URL.createObjectURL(file) : '',
      }
    })
  }

  const baseInput = isDark
    ? 'w-full rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-100 shadow-sm transition-colors duration-200 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none'
    : 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-black shadow-sm transition-colors duration-200 placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none'

  const baseSelect = `${baseInput} appearance-none pr-10`

  const pageWrapClass = isDark
    ? 'flex-1 rounded-3xl bg-slate-950/40 p-1 sm:p-2'
    : 'flex-1 rounded-3xl bg-white p-1 sm:p-2'

  const surfaceClass = isDark
    ? 'rounded-3xl bg-slate-900 ring-1 ring-slate-700 shadow-[0_14px_32px_rgba(2,6,23,0.42)]'
    : 'rounded-3xl bg-white ring-1 ring-slate-200 shadow-[0_18px_36px_rgba(15,23,42,0.14)]'

  const subtleText = isDark ? 'text-slate-300' : 'text-slate-600'
  const strongText = isDark ? 'text-slate-100' : 'text-black'
  const sectionTitle = isDark ? 'text-indigo-300' : 'text-indigo-600'

  const secondaryButton = isDark
    ? 'rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-100 transition duration-200 hover:bg-slate-800'
    : 'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-black transition duration-200 hover:bg-slate-50'

  const backButton = isDark
    ? 'rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2 text-sm font-semibold text-slate-100 transition duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
    : 'rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-black transition duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'

  const toggleRowClass = isDark
    ? 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/40 p-3 pr-4'
    : 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 pr-4'

  const switchClass = (enabled) =>
    `relative h-6 w-11 overflow-hidden rounded-full transition-colors duration-200 ${
      enabled
        ? isDark
          ? 'bg-indigo-500'
          : 'bg-indigo-600'
        : isDark
          ? 'bg-slate-700'
          : 'bg-slate-200'
    }`

  const knobClass = (enabled) =>
    `absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200 ${
      enabled ? 'translate-x-5' : 'translate-x-0.5'
    }`

  const Badge = ({ children, tone = 'neutral' }) => {
    const base = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold'
    const variants = {
      neutral: isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700',
      green: isDark ? 'bg-emerald-950 text-emerald-200' : 'bg-emerald-50 text-emerald-700',
      red: isDark ? 'bg-rose-950 text-rose-200' : 'bg-rose-50 text-rose-700',
      blue: isDark ? 'bg-indigo-950 text-indigo-200' : 'bg-indigo-50 text-indigo-700',
      amber: isDark ? 'bg-amber-950 text-amber-200' : 'bg-amber-50 text-amber-700',
    }
    return <span className={`${base} ${variants[tone] ?? variants.neutral}`}>{children}</span>
  }

  return (
    <DashboardLayout>
      <AppSidebar
        brandTitle={brandTitle}
        subTitle={sidebarSubTitle}
        navSections={navSections}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <main className={pageWrapClass}>
        <header className={`${surfaceClass} mb-3 p-4 md:mb-4 md:p-5`}>
          <p
            className={`text-xs font-semibold uppercase tracking-[0.16em] ${sectionTitle}`}
          >
            {brandTitle}
          </p>
          <h2
            className={`mt-1 text-2xl font-semibold tracking-tight ${strongText} md:text-3xl`}
          >
            Create Shop
          </h2>
          <p className={`mt-1 text-sm ${subtleText}`}>
            Follow the steps to register your shop.
          </p>
        </header>

        <section className={`${surfaceClass} p-4 md:p-5`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${strongText}`}>
                Step {stepIndex + 1} of {steps.length}: {currentStep.title}
              </p>
              <div className="mt-2 flex gap-2">
                {steps.map((s, i) => {
                  const isActive = i === stepIndex
                  const isDone = i < stepIndex
                  const trackClass = isDark ? 'bg-slate-800' : 'bg-slate-200'
                  const fillClass =
                    isActive || isDone
                      ? isDark
                        ? 'bg-indigo-500'
                        : 'bg-indigo-600'
                      : trackClass
                  return (
                    <div
                      key={s.id}
                      className={`h-2 flex-1 rounded-full ${trackClass}`}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${fillClass}`}
                        style={{ width: isActive || isDone ? '100%' : '0%' }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className={secondaryButton}
                onClick={() => navigate(listingPath, { replace: true })}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="mt-4">
            <div
              key={stepKeyRef.current}
              className="transition-all duration-300 ease-out"
            >
              {stepIndex === 0 && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className={`mb-1 block text-xs font-semibold ${strongText}`}>
                      Shop Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={baseInput}
                      value={form.shop_name}
                      onChange={(e) => {
                        markTouched('shop_name')
                        setForm((prev) => ({ ...prev, shop_name: e.target.value }))
                      }}
                      onBlur={() => markTouched('shop_name')}
                      placeholder="Shop name"
                    />
                    {showFieldError('shop_name') ? (
                      <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-300">
                        {errors.shop_name}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className={`mb-1 block text-xs font-semibold ${strongText}`}>
                      Shop ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={baseInput}
                      value={form.shop_id}
                      onChange={(e) => {
                        markTouched('shop_id')
                        setForm((prev) => ({
                          ...prev,
                          shop_id: e.target.value.toLowerCase(),
                        }))
                      }}
                      onBlur={() => markTouched('shop_id')}
                      placeholder="e.g. greenbasket-821"
                    />
                    {showFieldError('shop_id') ? (
                      <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-300">
                        {errors.shop_id}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className={`mb-1 block text-xs font-semibold ${strongText}`}>
                      User ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={baseInput}
                      value={form.user_id}
                      onChange={(e) => {
                        markTouched('user_id')
                        setForm((prev) => ({ ...prev, user_id: e.target.value }))
                      }}
                      onBlur={() => markTouched('user_id')}
                      placeholder="e.g. 101"
                      inputMode="numeric"
                    />
                    {showFieldError('user_id') ? (
                      <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-300">
                        {errors.user_id}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}

              {stepIndex === 1 && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className={`mb-1 block text-xs font-semibold ${strongText}`}>
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative">
                        <button
                          type="button"
                          className={`${baseInput} w-[108px] cursor-pointer select-none whitespace-nowrap py-1.5 leading-none text-left`}
                        >
                          {phoneDialDisplay}
                        </button>
                        <div className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs text-slate-400">
                          ▾
                        </div>
                        <select
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          value={form.phone_country}
                          onChange={(e) => setPhoneCountry(e.target.value)}
                          aria-label="Select country code"
                        >
                          <option value="IN">India (+91)</option>
                          <option value="UAE">UAE (+971)</option>
                        </select>
                      </div>
                      <input
                        className={`${baseInput} py-1.5`}
                        value={form.phone_local}
                        onChange={(e) => {
                          markTouched('phone_local')
                          setForm((prev) => ({ ...prev, phone_local: e.target.value }))
                        }}
                        onBlur={() => markTouched('phone_local')}
                        placeholder="Phone number"
                        inputMode="tel"
                      />
                    </div>
                    {showFieldError('phone_local') ? (
                      <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-300">
                        {errors.phone_local}
                      </p>
                    ) : null}
                    {!showFieldError('phone_local') ? (
                      <p className={`mt-1 text-xs ${subtleText}`}>
                        Full number: {form.phone_dial_code}
                        {String(form.phone_local || '').replace(/\\s+/g, '')}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className={`mb-1 block text-xs font-semibold ${strongText}`}>
                      Email (optional)
                    </label>
                    <input
                      className={baseInput}
                      value={form.email}
                      onChange={update('email')}
                      placeholder="name@example.com"
                      inputMode="email"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={`mb-1 block text-xs font-semibold ${strongText}`}>
                      Shop License No <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={baseInput}
                      value={form.shop_license_no}
                      onChange={(e) => {
                        markTouched('shop_license_no')
                        setForm((prev) => ({
                          ...prev,
                          shop_license_no: e.target.value.toLowerCase(),
                        }))
                      }}
                      onBlur={() => markTouched('shop_license_no')}
                      placeholder="e.g. greenbasket-lic-821"
                    />
                    {showFieldError('shop_license_no') ? (
                      <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-300">
                        {errors.shop_license_no}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className={`mb-1 block text-xs font-semibold ${strongText}`}>
                      Contact person number (optional)
                    </label>
                    <input
                      className={baseInput}
                      value={form.contact_person_number}
                      onChange={update('contact_person_number')}
                      placeholder="If empty, shop phone will be used"
                      inputMode="tel"
                    />
                  </div>
                  <div>
                    <label className={`mb-1 block text-xs font-semibold ${strongText}`}>
                      Contact person email (optional)
                    </label>
                    <input
                      className={baseInput}
                      value={form.contact_person_email}
                      onChange={update('contact_person_email')}
                      placeholder="contact@example.com"
                      inputMode="email"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={`mb-1 block text-xs font-semibold ${strongText}`}>
                      Photo <span className="text-red-500">*</span>
                    </label>
                    <div
                      className={`flex flex-col gap-3 rounded-2xl border p-3 transition ${
                        isDark
                          ? 'border-slate-700 bg-slate-800/40'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <input
                        id="shop-photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="sr-only"
                      />
                      <label
                        htmlFor="shop-photo-upload"
                        className={`inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                          isDark
                            ? 'border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800'
                            : 'border-slate-200 bg-white text-black hover:bg-slate-50'
                        }`}
                        onClick={() => markTouched('photoFile')}
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                          className={isDark ? 'text-slate-200' : 'text-slate-700'}
                        >
                          <path
                            d="M12 3v10m0 0 4-4m-4 4-4-4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M4 17a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Upload
                      </label>
                      <p className={`text-xs ${subtleText}`}>JPG/PNG • Max 5MB.</p>
                      {showFieldError('photoFile') ? (
                        <p className="text-xs font-medium text-red-700 dark:text-red-300">
                          {errors.photoFile}
                        </p>
                      ) : null}
                      {form.photoPreviewUrl ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={form.photoPreviewUrl}
                            alt="Shop preview"
                            className="h-16 w-16 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold ${strongText}`}>
                              Preview
                            </p>
                            <p className={`text-xs ${subtleText} truncate`}>
                              {form.photoFile?.name ?? ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => {
                                if (prev.photoPreviewUrl) {
                                  URL.revokeObjectURL(prev.photoPreviewUrl)
                                }
                                return {
                                  ...prev,
                                  photoFile: null,
                                  photoPreviewUrl: '',
                                }
                              })
                            }
                            className={secondaryButton}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <p className={`text-xs ${subtleText}`}>Upload is required to continue.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {stepIndex === 2 && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className={`mb-1 block text-xs font-semibold ${strongText}`}>
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={baseInput}
                      value={form.street_address}
                      onChange={(e) => {
                        markTouched('street_address')
                        setForm((prev) => ({
                          ...prev,
                          street_address: e.target.value,
                        }))
                      }}
                      onBlur={() => markTouched('street_address')}
                      placeholder="House no, street, landmark"
                    />
                    {showFieldError('street_address') ? (
                      <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-300">
                        {errors.street_address}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className={`mb-1 block text-xs font-semibold ${strongText}`}>
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={baseInput}
                      value={form.city}
                      onChange={(e) => {
                        markTouched('city')
                        setForm((prev) => ({ ...prev, city: e.target.value }))
                      }}
                      onBlur={() => markTouched('city')}
                      placeholder="City"
                    />
                    {showFieldError('city') ? (
                      <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-300">
                        {errors.city}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className={`mb-1 block text-xs font-semibold ${strongText}`}>
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={baseInput}
                      value={form.state}
                      onChange={(e) => {
                        markTouched('state')
                        setForm((prev) => ({ ...prev, state: e.target.value }))
                      }}
                      onBlur={() => markTouched('state')}
                      placeholder="State"
                    />
                    {showFieldError('state') ? (
                      <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-300">
                        {errors.state}
                      </p>
                    ) : null}
                  </div>
                  <div className="md:col-span-2">
                    <label className={`mb-1 block text-xs font-semibold ${strongText}`}>
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={baseInput}
                      value={form.pincode}
                      onChange={(e) => {
                        markTouched('pincode')
                        setForm((prev) => ({ ...prev, pincode: e.target.value }))
                      }}
                      onBlur={() => markTouched('pincode')}
                      placeholder="Pincode"
                      inputMode="numeric"
                    />
                    {showFieldError('pincode') ? (
                      <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-300">
                        {errors.pincode}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className={`mb-1 block text-xs font-semibold ${strongText}`}>
                      Latitude <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={baseInput}
                      value={form.latitude}
                      onChange={(e) => {
                        markTouched('latitude')
                        setForm((prev) => ({ ...prev, latitude: e.target.value }))
                      }}
                      onBlur={() => markTouched('latitude')}
                      placeholder="e.g. 11.0168"
                      inputMode="decimal"
                    />
                    {showFieldError('latitude') ? (
                      <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-300">
                        {errors.latitude}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className={`mb-1 block text-xs font-semibold ${strongText}`}>
                      Longitude <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={baseInput}
                      value={form.longitude}
                      onChange={(e) => {
                        markTouched('longitude')
                        setForm((prev) => ({ ...prev, longitude: e.target.value }))
                      }}
                      onBlur={() => markTouched('longitude')}
                      placeholder="e.g. 76.9558"
                      inputMode="decimal"
                    />
                    {showFieldError('longitude') ? (
                      <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-300">
                        {errors.longitude}
                      </p>
                    ) : null}
                  </div>

                  <div className="md:col-span-2">
                    <p
                      className={`mb-2 text-xs font-semibold uppercase tracking-[0.16em] ${sectionTitle}`}
                    >
                      Map
                    </p>
                    <LocationPickerMap
                      isDark={isDark}
                      value={{
                        lat: form.latitude ? Number(form.latitude) : null,
                        lng: form.longitude ? Number(form.longitude) : null,
                      }}
                      onChange={({ lat, lng }) => {
                        setForm((prev) => ({
                          ...prev,
                          latitude: String(lat),
                          longitude: String(lng),
                        }))
                        markTouched('latitude')
                        markTouched('longitude')
                      }}
                    />
                    <p className={`mt-2 text-xs ${subtleText}`}>
                      Tip: click on the map to set the pin, or use current location.
                    </p>
                  </div>
                </div>
              )}

              {stepIndex === 3 && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className={toggleRowClass}>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${strongText}`}>
                        Is Automated
                      </p>
                      <p className={`mt-1 text-xs ${subtleText}`}>
                        For automated order creation.
                      </p>
                    </div>
                    <div className="flex items-center justify-self-end gap-2">
                      <span className={`text-xs font-semibold ${subtleText}`}>
                        {form.is_automated ? 'ON' : 'OFF'}
                      </span>
                      <button
                        type="button"
                        onClick={toggleBool('is_automated')}
                        className={`${switchClass(form.is_automated)} shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-400/60`}
                        aria-pressed={form.is_automated}
                        aria-label="Toggle is automated"
                      >
                        <span className={knobClass(form.is_automated)} />
                      </button>
                    </div>
                  </div>

                  <div className={toggleRowClass}>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${strongText}`}>
                        Self Assigned
                      </p>
                      <p className={`mt-1 text-xs ${subtleText}`}>
                        Allow delivery partners to self-assign orders.
                      </p>
                    </div>
                    <div className="flex items-center justify-self-end gap-2">
                      <span className={`text-xs font-semibold ${subtleText}`}>
                        {form.self_assigned ? 'ON' : 'OFF'}
                      </span>
                      <button
                        type="button"
                        onClick={toggleBool('self_assigned')}
                        className={`${switchClass(form.self_assigned)} shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-400/60`}
                        aria-pressed={form.self_assigned}
                        aria-label="Toggle self assigned"
                      >
                        <span className={knobClass(form.self_assigned)} />
                      </button>
                    </div>
                  </div>

                  <div className={toggleRowClass}>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${strongText}`}>
                        SMS Activated
                      </p>
                      <p className={`mt-1 text-xs ${subtleText}`}>
                        Enable SMS notifications for this supermarket.
                      </p>
                    </div>
                    <div className="flex items-center justify-self-end gap-2">
                      <span className={`text-xs font-semibold ${subtleText}`}>
                        {form.is_sms_activated ? 'ON' : 'OFF'}
                      </span>
                      <button
                        type="button"
                        onClick={toggleBool('is_sms_activated')}
                        className={`${switchClass(form.is_sms_activated)} shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-400/60`}
                        aria-pressed={form.is_sms_activated}
                        aria-label="Toggle SMS activated"
                      >
                        <span className={knobClass(form.is_sms_activated)} />
                      </button>
                    </div>
                  </div>

                  <div className={toggleRowClass}>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${strongText}`}>
                        WhatsApp Enabled
                      </p>
                      <p className={`mt-1 text-xs ${subtleText}`}>
                        Allow communication / notifications over WhatsApp.
                      </p>
                    </div>
                    <div className="flex items-center justify-self-end gap-2">
                      <span className={`text-xs font-semibold ${subtleText}`}>
                        {form.whatsapp ? 'ON' : 'OFF'}
                      </span>
                      <button
                        type="button"
                        onClick={toggleBool('whatsapp')}
                        className={`${switchClass(form.whatsapp)} shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-400/60`}
                        aria-pressed={form.whatsapp}
                        aria-label="Toggle WhatsApp enabled"
                      >
                        <span className={knobClass(form.whatsapp)} />
                      </button>
                    </div>
                  </div>

                  <div className={toggleRowClass}>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${strongText}`}>
                        Is Supermarket
                      </p>
                      <p className={`mt-1 text-xs ${subtleText}`}>
                        Indicates if this shop is a supermarket.
                      </p>
                    </div>
                    <div className="flex items-center justify-self-end gap-2">
                      <span className={`text-xs font-semibold ${subtleText}`}>
                        {form.is_supermarket ? 'ON' : 'OFF'}
                      </span>
                      <button
                        type="button"
                        onClick={toggleBool('is_supermarket')}
                        className={`${switchClass(form.is_supermarket)} shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-400/60`}
                        aria-pressed={form.is_supermarket}
                        aria-label="Toggle is supermarket"
                      >
                        <span className={knobClass(form.is_supermarket)} />
                      </button>
                    </div>
                  </div>

                  <div className={toggleRowClass}>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${strongText}`}>
                        Single SMS
                      </p>
                      <p className={`mt-1 text-xs ${subtleText}`}>
                        Enable single SMS notification mode.
                      </p>
                    </div>
                    <div className="flex items-center justify-self-end gap-2">
                      <span className={`text-xs font-semibold ${subtleText}`}>
                        {form.single_sms ? 'ON' : 'OFF'}
                      </span>
                      <button
                        type="button"
                        onClick={toggleBool('single_sms')}
                        className={`${switchClass(form.single_sms)} shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-400/60`}
                        aria-pressed={form.single_sms}
                        aria-label="Toggle single SMS"
                      >
                        <span className={knobClass(form.single_sms)} />
                      </button>
                    </div>
                  </div>

                  <div className={toggleRowClass}>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold ${strongText}`}>
                        Marketing Enabled
                      </p>
                      <p className={`mt-1 text-xs ${subtleText}`}>
                        Enable marketing/promotion for this shop.
                      </p>
                    </div>
                    <div className="flex items-center justify-self-end gap-2">
                      <span className={`text-xs font-semibold ${subtleText}`}>
                        {form.is_marketing_enabled ? 'ON' : 'OFF'}
                      </span>
                      <button
                        type="button"
                        onClick={toggleBool('is_marketing_enabled')}
                        className={`${switchClass(form.is_marketing_enabled)} shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-400/60`}
                        aria-pressed={form.is_marketing_enabled}
                        aria-label="Toggle marketing enabled"
                      >
                        <span className={knobClass(form.is_marketing_enabled)} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {stepIndex === 4 && (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  <div className="space-y-3">
                    <div
                      className={`rounded-2xl border p-3 ${
                        isDark
                          ? 'border-slate-700 bg-slate-800/40'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${sectionTitle}`}>
                        Password
                      </p>
                      <div className="mt-3 grid grid-cols-1 gap-3">
                        <div>
                          <label className={`mb-1 block text-xs font-semibold ${strongText}`}>
                            New Password <span className="text-red-500">*</span>
                          </label>
                          <input
                            className={baseInput}
                            value={form.password}
                            onChange={(e) => {
                              markTouched('password')
                              setForm((prev) => ({ ...prev, password: e.target.value }))
                            }}
                            onBlur={() => markTouched('password')}
                            placeholder="Create a password (min 6 chars)"
                            type={form.show_password ? 'text' : 'password'}
                            autoComplete="new-password"
                          />
                          {showFieldError('password') ? (
                            <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-300">
                              {errors.password}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <label className={`mb-1 block text-xs font-semibold ${strongText}`}>
                            Confirm Password <span className="text-red-500">*</span>
                          </label>
                          <input
                            className={baseInput}
                            value={form.confirm_password}
                            onChange={(e) => {
                              markTouched('confirm_password')
                              setForm((prev) => ({
                                ...prev,
                                confirm_password: e.target.value,
                              }))
                            }}
                            onBlur={() => markTouched('confirm_password')}
                            placeholder="Re-enter password"
                            type={form.show_password ? 'text' : 'password'}
                            autoComplete="new-password"
                          />
                          {showFieldError('confirm_password') ? (
                            <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-300">
                              {errors.confirm_password}
                            </p>
                          ) : null}
                        </div>

                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.show_password}
                            onChange={updateBool('show_password')}
                          />
                          <span className={subtleText}>Show password</span>
                        </label>

                        {form.password &&
                        form.confirm_password &&
                        form.password === form.confirm_password ? (
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                            Passwords match.
                          </p>
                        ) : null}

                        {form.password &&
                        form.confirm_password &&
                        form.password !== form.confirm_password ? (
                          <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                            Passwords do not match.
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div
                      className={`rounded-2xl border p-3 ${
                        isDark
                          ? 'border-slate-700 bg-slate-800/40'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 overflow-hidden pr-1">
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold ${strongText}`}>
                            Add Subscription (optional)
                          </p>
                          <p className={`mt-1 text-xs ${subtleText}`}>
                            Start date will be set to the current time automatically.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={toggleBool('subscription_enabled')}
                          className={`${switchClass(form.subscription_enabled)} shrink-0 justify-self-end`}
                          aria-pressed={form.subscription_enabled}
                          aria-label="Toggle subscription"
                        >
                          <span className={knobClass(form.subscription_enabled)} />
                        </button>
                      </div>

                      {form.subscription_enabled ? (
                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div>
                            <label className={`mb-1 block text-xs font-semibold ${strongText}`}>
                              Amount <span className="text-red-500">*</span>
                            </label>
                            <input
                              className={baseInput}
                              value={form.subscription_amount}
                              onChange={(e) => {
                                markTouched('subscription_amount')
                                setForm((prev) => ({
                                  ...prev,
                                  subscription_amount: e.target.value,
                                }))
                              }}
                              onBlur={() => markTouched('subscription_amount')}
                              placeholder="e.g. 999.00"
                              inputMode="decimal"
                            />
                            {showFieldError('subscription_amount') ? (
                              <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-300">
                                {errors.subscription_amount}
                              </p>
                            ) : null}
                          </div>
                          <div className="relative">
                            <label className={`mb-1 block text-xs font-semibold ${strongText}`}>
                              Status <span className="text-red-500">*</span>
                            </label>
                            <select
                              className={baseSelect}
                              value={form.subscription_status}
                              onChange={(e) => {
                                markTouched('subscription_status')
                                setForm((prev) => ({
                                  ...prev,
                                  subscription_status: e.target.value,
                                }))
                              }}
                              onBlur={() => markTouched('subscription_status')}
                            >
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="PENDING">PENDING</option>
                              <option value="INACTIVE">INACTIVE</option>
                            </select>
                            {showFieldError('subscription_status') ? (
                              <p className="mt-1 text-xs font-medium text-red-700 dark:text-red-300">
                                {errors.subscription_status}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl border p-3 ${
                      isDark
                        ? 'border-slate-700 bg-slate-800/40'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${sectionTitle}`}>
                      Review
                    </p>

                    <div className="mt-3 space-y-3">
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${sectionTitle}`}>
                          Shop
                        </p>
                        {form.photoPreviewUrl ? (
                          <div className="mt-2 flex items-center gap-3">
                            <img
                              src={form.photoPreviewUrl}
                              alt="Shop preview"
                              className="h-14 w-14 rounded-2xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                            />
                            <div className="min-w-0">
                              <p
                                className={`text-xs font-semibold uppercase tracking-[0.16em] ${sectionTitle}`}
                              >
                                Photo
                              </p>
                              <p className={`text-xs ${subtleText} truncate`}>
                                {form.photoFile?.name ?? 'uploaded'}
                              </p>
                            </div>
                          </div>
                        ) : null}
                        <p className={`mt-1 text-sm ${subtleText}`}>
                          {form.shop_name} ({form.shop_id}) — User ID {form.user_id}
                        </p>
                        <p className={`mt-1 text-sm ${subtleText}`}>
                          Phone: {form.phone_dial_code}
                          {String(form.phone_local || '').replace(/\\s+/g, '')} · Email:{' '}
                          {form.email || '—'}
                        </p>
                        <p className={`mt-1 text-sm ${subtleText}`}>
                          License: {form.shop_license_no || '—'}
                        </p>
                        <p className={`mt-1 text-sm ${subtleText}`}>
                          Contact person: {form.contact_person_number || '—'} ·{' '}
                          {form.contact_person_email || '—'}
                        </p>
                      </div>

                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${sectionTitle}`}>
                          Address
                        </p>
                        <p className={`mt-1 text-sm ${subtleText}`}>
                          {form.street_address}
                        </p>
                        <p className={`mt-1 text-sm ${subtleText}`}>
                          {form.city}, {form.state} - {form.pincode}
                        </p>
                        <p className={`mt-1 text-sm ${subtleText}`}>
                          Geo: {form.latitude || '—'}, {form.longitude || '—'}
                        </p>
                      </div>

                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${sectionTitle}`}>
                          Preferences
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge tone={form.is_automated ? 'blue' : 'neutral'}>
                            Automated: {form.is_automated ? 'ON' : 'OFF'}
                          </Badge>
                          <Badge tone={form.self_assigned ? 'blue' : 'neutral'}>
                            SelfAssigned: {form.self_assigned ? 'ON' : 'OFF'}
                          </Badge>
                          <Badge tone={form.is_sms_activated ? 'blue' : 'neutral'}>
                            SMS: {form.is_sms_activated ? 'ON' : 'OFF'}
                          </Badge>
                          <Badge tone={form.whatsapp ? 'blue' : 'neutral'}>
                            WhatsApp: {form.whatsapp ? 'ON' : 'OFF'}
                          </Badge>
                          <Badge tone={form.is_supermarket ? 'blue' : 'neutral'}>
                            Supermarket: {form.is_supermarket ? 'ON' : 'OFF'}
                          </Badge>
                          <Badge tone={form.single_sms ? 'blue' : 'neutral'}>
                            SingleSMS: {form.single_sms ? 'ON' : 'OFF'}
                          </Badge>
                          <Badge tone={form.is_marketing_enabled ? 'blue' : 'neutral'}>
                            Marketing: {form.is_marketing_enabled ? 'ON' : 'OFF'}
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${sectionTitle}`}>
                          Subscription
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {form.subscription_enabled ? (
                            <>
                              <Badge tone="green">Enabled</Badge>
                              <Badge
                                tone={
                                  form.subscription_status === 'ACTIVE'
                                    ? 'green'
                                    : form.subscription_status === 'PENDING'
                                      ? 'amber'
                                      : 'red'
                                }
                              >
                                {form.subscription_status}
                              </Badge>
                              <Badge tone="neutral">Amount: {form.subscription_amount || '—'}</Badge>
                            </>
                          ) : (
                            <Badge tone="neutral">Not added</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {submitError && (
              <p className="mt-4 text-sm font-medium text-red-700 dark:text-red-300">
                {submitError}
              </p>
            )}
            {submitSuccess && (
              <p className="mt-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {submitSuccess}
              </p>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={stepIndex === 0 || isSubmitting}
              className={backButton}
            >
              Back
            </button>

            {stepIndex < steps.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!isStepValid || isSubmitting}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!isStepValid || isSubmitting}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition duration-200 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        </section>
      </main>
    </DashboardLayout>
  )
}

export default ShopCreatePage

