import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../ThemeContext";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png"
});

// Blue icon for user location
const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

// Red icon for pharmacies
const pharmacyIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

// Component to set map center after load
function SetCenter({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.setView([location.lat, location.lng], 15);
    }
  }, [location]);
  return null;
}

function Pharmacy() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pharmacies, setPharmacies] = useState([]);
  const [userLocation, setUserLocation] = useState(null);

  const t = {
    bg: darkMode ? "#111827" : "#ffffff",
    card: darkMode ? "#1f2937" : "#ffffff",
    border: darkMode ? "#374151" : "#e5e7eb",
    text: darkMode ? "#f9fafb" : "#111827",
    muted: darkMode ? "#9ca3af" : "#6b7280"
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Location access is not supported on this browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(location);
        await fetchPharmacies(location);
        setLoading(false);
      },
      () => {
        setError("Location access denied. Please allow location access and reload the page.");
        setLoading(false);
      }
    );
  }, []);

  // Fetch nearby pharmacies using OpenStreetMap Overpass API
  const fetchPharmacies = async (location) => {
    try {
      const radius = 2000;
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="pharmacy"](around:${radius},${location.lat},${location.lng});
          node["shop"="chemist"](around:${radius},${location.lat},${location.lng});
          node["healthcare"="pharmacy"](around:${radius},${location.lat},${location.lng});
        );
        out body;
      `;

      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query
      });

      const data = await response.json();

      if (data.elements && data.elements.length > 0) {
        const list = data.elements.map((el) => ({
          id: el.id,
          name: el.tags?.name || el.tags?.["name:en"] || "Medical Store",
          lat: el.lat,
          lng: el.lon,
          phone: el.tags?.phone || el.tags?.["contact:phone"] || "",
          opening_hours: el.tags?.opening_hours || "",
          address: [
            el.tags?.["addr:housenumber"],
            el.tags?.["addr:street"],
            el.tags?.["addr:city"]
          ].filter(Boolean).join(", ")
        }));
        setPharmacies(list);
      } else {
        setError("No pharmacies found within 2km. Try in a more populated area.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch pharmacies. Check your internet connection.");
    }
  };

  const getDistance = (lat2, lng2) => {
    if (!userLocation) return "";
    const R = 6371000;
    const dLat = ((lat2 - userLocation.lat) * Math.PI) / 180;
    const dLon = ((lng2 - userLocation.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLocation.lat * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    if (distance < 1000) return `${Math.round(distance)}m away`;
    return `${(distance / 1000).toFixed(1)}km away`;
  };

  const openInMaps = (pharmacy) => {
    window.open(
      `https://www.openstreetmap.org/?mlat=${pharmacy.lat}&mlon=${pharmacy.lng}&zoom=17`,
      "_blank"
    );
  };

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "24px 16px", fontFamily: "sans-serif", background: t.bg, minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
        <button
          style={{ padding: "8px 14px", background: t.card, border: `1px solid ${t.border}`, borderRadius: "8px", fontSize: "13px", cursor: "pointer", color: t.muted }}
          onClick={() => navigate("/dashboard")}
        >
          Back
        </button>
        <h1 style={{ fontSize: "20px", fontWeight: "600", margin: 0, color: t.text }}>
          Nearby Pharmacies
        </h1>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #ef4444", borderRadius: "8px", padding: "12px 14px", fontSize: "13px", color: "#dc2626", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div style={{ textAlign: "center", padding: "20px", color: t.muted, fontSize: "13px" }}>
          Finding your location and nearby pharmacies...
        </div>
      )}

      {/* Map */}
      {userLocation && (
        <div style={{ marginBottom: "20px", borderRadius: "12px", overflow: "hidden", border: `1px solid ${t.border}`, height: "280px" }}>
          <MapContainer
            center={[userLocation.lat, userLocation.lng]}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            <SetCenter location={userLocation} />

            {/* User location marker */}
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
              <Popup>You are here</Popup>
            </Marker>

            {/* Pharmacy markers */}
            {pharmacies.map((pharmacy) => (
              <Marker
                key={pharmacy.id}
                position={[pharmacy.lat, pharmacy.lng]}
                icon={pharmacyIcon}
              >
                <Popup>
                  <div style={{ fontFamily: "sans-serif", minWidth: "150px" }}>
                    <div style={{ fontWeight: "600", fontSize: "14px" }}>{pharmacy.name}</div>
                    {pharmacy.address && (
                      <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>{pharmacy.address}</div>
                    )}
                    {pharmacy.phone && (
                      <div style={{ fontSize: "12px", color: "#4F46E5", marginTop: "4px" }}>{pharmacy.phone}</div>
                    )}
                    {pharmacy.opening_hours && (
                      <div style={{ fontSize: "12px", color: "#666", marginTop: "4px" }}>{pharmacy.opening_hours}</div>
                    )}
                    <div style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>{getDistance(pharmacy.lat, pharmacy.lng)}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Pharmacy list */}
      {pharmacies.length > 0 && (
        <>
          <div style={{ fontSize: "13px", color: t.muted, marginBottom: "10px" }}>
            {pharmacies.length} pharmacies found within 2km
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {pharmacies.map((pharmacy) => (
              <div
                key={pharmacy.id}
                style={{ border: `1px solid ${t.border}`, borderRadius: "10px", padding: "14px", background: t.card, cursor: "pointer" }}
                onClick={() => openInMaps(pharmacy)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: "500", color: t.text }}>{pharmacy.name}</div>
                    {pharmacy.address && (
                      <div style={{ fontSize: "12px", color: t.muted, marginTop: "3px" }}>{pharmacy.address}</div>
                    )}
                    <div style={{ display: "flex", gap: "10px", marginTop: "6px", flexWrap: "wrap" }}>
                      {pharmacy.phone && (
                        <span style={{ fontSize: "11px", color: "#4F46E5" }}>{pharmacy.phone}</span>
                      )}
                      {pharmacy.opening_hours && (
                        <span style={{ fontSize: "11px", color: t.muted }}>{pharmacy.opening_hours}</span>
                      )}
                      <span style={{ fontSize: "11px", color: t.muted }}>
                        {getDistance(pharmacy.lat, pharmacy.lng)}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: "11px", color: "#4F46E5", fontWeight: "500", whiteSpace: "nowrap", marginLeft: "10px" }}>
                    Open in Maps
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  );
}

export default Pharmacy;