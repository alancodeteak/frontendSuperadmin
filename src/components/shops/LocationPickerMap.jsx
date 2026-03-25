import { useMemo, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'

function ClickToSelect({ onSelect, onInteracted }) {
  useMapEvents({
    click(e) {
      onInteracted?.()
      onSelect({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

function LocationPickerMap({
  value,
  onChange,
  isDark,
  height = 260,
  defaultCenter = { lat: 11.0168, lng: 76.9558 },
}) {
  const [status, setStatus] = useState('')

  const center = useMemo(() => {
    if (value?.lat && value?.lng) return { lat: value.lat, lng: value.lng }
    return defaultCenter
  }, [defaultCenter, value])

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatus('Geolocation not supported in this browser.')
      return
    }
    setStatus('Fetching current location...')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus('')
        onChange({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        })
      },
      () => setStatus('Unable to fetch location. Please click on the map.'),
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${
        isDark ? 'border-slate-700' : 'border-slate-200'
      }`}
    >
      <div
        className={`flex items-center justify-between gap-2 border-b px-3 py-2 text-xs ${
          isDark
            ? 'border-slate-700 bg-slate-900 text-slate-200'
            : 'border-slate-200 bg-white text-slate-700'
        }`}
      >
        <span className="font-semibold">Pick location</span>
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${
            isDark
              ? 'bg-slate-800 text-slate-100 hover:bg-slate-700'
              : 'bg-slate-100 text-black hover:bg-slate-200'
          }`}
        >
          Use current location
        </button>
      </div>

      <div style={{ height }}>
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToSelect onSelect={onChange} onInteracted={() => setStatus('')} />
          {value?.lat && value?.lng ? (
            <Marker position={{ lat: value.lat, lng: value.lng }} />
          ) : null}
        </MapContainer>
      </div>

      {status ? (
        <div
          className={`px-3 py-2 text-xs ${
            isDark ? 'bg-slate-900 text-slate-300' : 'bg-white text-slate-600'
          }`}
        >
          {status}
        </div>
      ) : null}
    </div>
  )
}

export default LocationPickerMap

