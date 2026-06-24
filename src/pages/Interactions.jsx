import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useTheme } from "../ThemeContext";

function Interactions() {
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [medicine1, setMedicine1] = useState("");
  const [medicine2, setMedicine2] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const t = {
    bg: darkMode ? "#111827" : "#ffffff",
    card: darkMode ? "#1f2937" : "#ffffff",
    border: darkMode ? "#374151" : "#e5e7eb",
    text: darkMode ? "#f9fafb" : "#111827",
    muted: darkMode ? "#9ca3af" : "#6b7280",
    input: darkMode ? "#1f2937" : "#ffffff",
    inputText: darkMode ? "#f9fafb" : "#111827"
  };

  useEffect(() => {
    const fetchMedicines = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/");
        return;
      }
      try {
        const q = query(
          collection(db, "medicines"),
          where("createdBy", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        setMedicines(list);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchMedicines();
  }, []);

  // Look up drug name in FDA to get its standard name
  const getFDADrugName = async (medicineName) => {
    try {
      const response = await fetch(
        `https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(medicineName)}"&limit=1`
      );
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return (
          result.openfda?.generic_name?.[0] ||
          result.openfda?.brand_name?.[0] ||
          medicineName
        );
      }
    } catch (err) {
      console.error(err);
    }
    return medicineName;
  };

  // Check interactions between two medicines
  const checkInteraction = async () => {
    if (!medicine1 || !medicine2) {
      setError("Please select two medicines to check.");
      return;
    }
    if (medicine1 === medicine2) {
      setError("Please select two different medicines.");
      return;
    }

    setChecking(true);
    setResult(null);
    setError("");

    const med1 = medicines.find(m => m.id === medicine1);
    const med2 = medicines.find(m => m.id === medicine2);

    try {
      // Get standard FDA names for both medicines
      const name1 = await getFDADrugName(med1.medicineName);
      const name2 = await getFDADrugName(med2.medicineName);

      // Check FDA drug interaction database
      const response = await fetch(
        `https://api.fda.gov/drug/label.json?search=drug_interactions:"${encodeURIComponent(name2)}"&limit=5`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const interactions = data.results
          .filter(r =>
            r.drug_interactions &&
            r.drug_interactions.some(i =>
              i.toLowerCase().includes(name2.toLowerCase()) ||
              i.toLowerCase().includes(med2.medicineName.toLowerCase())
            )
          )
          .map(r => r.drug_interactions)
          .flat()
          .filter(i =>
            i.toLowerCase().includes(name2.toLowerCase()) ||
            i.toLowerCase().includes(med2.medicineName.toLowerCase())
          );

        if (interactions.length > 0) {
          setResult({
            type: "warning",
            medicine1: med1.medicineName,
            medicine2: med2.medicineName,
            interactions: interactions.slice(0, 3)
          });
        } else {
          setResult({
            type: "safe",
            medicine1: med1.medicineName,
            medicine2: med2.medicineName
          });
        }
      } else {
        setResult({
          type: "unknown",
          medicine1: med1.medicineName,
          medicine2: med2.medicineName
        });
      }
    } catch (err) {
      setResult({
        type: "unknown",
        medicine1: med1.medicineName,
        medicine2: med2.medicineName
      });
    }

    setChecking(false);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px", fontFamily: "sans-serif", color: "#6b7280" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "24px 16px", fontFamily: "sans-serif", background: t.bg, minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
        <button
          style={{ padding: "8px 14px", background: t.card, border: `1px solid ${t.border}`, borderRadius: "8px", fontSize: "13px", cursor: "pointer", color: t.muted }}
          onClick={() => navigate("/dashboard")}
        >
          Back
        </button>
        <h1 style={{ fontSize: "20px", fontWeight: "600", margin: 0, color: t.text }}>
          Interaction Checker
        </h1>
      </div>

      <p style={{ fontSize: "13px", color: t.muted, marginBottom: "24px", lineHeight: "1.5" }}>
        Select two medicines from your cabinet to check if they have known interactions. Data is from the FDA drug database.
      </p>

      {/* Medicine 1 selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
        <label style={{ fontSize: "13px", color: t.text, fontWeight: "500" }}>
          First medicine
        </label>
        <select
          style={{ padding: "11px 12px", border: `1px solid ${t.border}`, borderRadius: "8px", fontSize: "14px", outline: "none", background: t.input, color: t.inputText, cursor: "pointer" }}
          value={medicine1}
          onChange={(e) => {
            setMedicine1(e.target.value);
            setResult(null);
            setError("");
          }}
        >
          <option value="">Select medicine</option>
          {medicines.map((m) => (
            <option key={m.id} value={m.id}>{m.medicineName}</option>
          ))}
        </select>
      </div>

      {/* VS divider */}
      <div style={{ textAlign: "center", fontSize: "13px", fontWeight: "600", color: t.muted, marginBottom: "16px" }}>
        VS
      </div>

      {/* Medicine 2 selector */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "24px" }}>
        <label style={{ fontSize: "13px", color: t.text, fontWeight: "500" }}>
          Second medicine
        </label>
        <select
          style={{ padding: "11px 12px", border: `1px solid ${t.border}`, borderRadius: "8px", fontSize: "14px", outline: "none", background: t.input, color: t.inputText, cursor: "pointer" }}
          value={medicine2}
          onChange={(e) => {
            setMedicine2(e.target.value);
            setResult(null);
            setError("");
          }}
        >
          <option value="">Select medicine</option>
          {medicines.map((m) => (
            <option key={m.id} value={m.id}>{m.medicineName}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <p style={{ color: "#ef4444", fontSize: "13px", margin: "0 0 16px 0" }}>{error}</p>
      )}

      {/* Check button */}
      <button
        style={{
          width: "100%",
          padding: "13px",
          background: checking ? "#9ca3af" : "#4F46E5",
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: "500",
          cursor: checking ? "not-allowed" : "pointer",
          marginBottom: "24px"
        }}
        onClick={checkInteraction}
        disabled={checking}
      >
        {checking ? "Checking interactions..." : "Check interactions"}
      </button>

      {/* Result */}
      {result && (
        <div style={{
          border: `1px solid ${result.type === "warning" ? "#ef4444" : result.type === "safe" ? "#22c55e" : "#f59e0b"}`,
          borderRadius: "10px",
          padding: "16px",
          background: result.type === "warning"
            ? (darkMode ? "#1f0a0a" : "#fef2f2")
            : result.type === "safe"
            ? (darkMode ? "#0a1f0a" : "#f0fdf4")
            : (darkMode ? "#1f1a0a" : "#fffbeb")
        }}>

          {/* Result header */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: result.type === "warning" ? "#ef4444" : result.type === "safe" ? "#22c55e" : "#f59e0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              {result.type === "warning" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              )}
              {result.type === "safe" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {result.type === "unknown" && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 8v4M12 16h.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              )}
            </div>
            <div style={{
              fontSize: "15px",
              fontWeight: "600",
              color: result.type === "warning" ? "#dc2626" : result.type === "safe" ? "#15803d" : "#92400e"
            }}>
              {result.type === "warning" ? "Interaction found" :
               result.type === "safe" ? "No known interactions" :
               "No data available"}
            </div>
          </div>

          {/* Medicine names */}
          <div style={{ fontSize: "13px", color: t.muted, marginBottom: "12px" }}>
            {result.medicine1} and {result.medicine2}
          </div>

          {/* Interaction details */}
          {result.type === "warning" && result.interactions && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {result.interactions.map((interaction, index) => (
                <div
                  key={index}
                  style={{ fontSize: "13px", color: t.text, lineHeight: "1.6", padding: "10px", background: darkMode ? "#2a0a0a" : "#fff5f5", borderRadius: "6px", border: "1px solid #fca5a5" }}
                >
                  {interaction.length > 300 ? interaction.substring(0, 300) + "..." : interaction}
                </div>
              ))}
            </div>
          )}

          {result.type === "safe" && (
            <div style={{ fontSize: "13px", color: "#15803d", lineHeight: "1.6" }}>
              No known interactions were found between these two medicines in the FDA database. Always consult your doctor before combining medicines.
            </div>
          )}

          {result.type === "unknown" && (
            <div style={{ fontSize: "13px", color: "#92400e", lineHeight: "1.6" }}>
              These medicines were not found in the FDA database. This is common for Indian brand names. Consult your doctor or pharmacist to verify interactions.
            </div>
          )}

          {/* Disclaimer */}
          <div style={{ fontSize: "11px", color: t.muted, marginTop: "12px", padding: "8px", background: darkMode ? "#ffffff10" : "#00000008", borderRadius: "6px" }}>
            This is for informational purposes only. Always consult a doctor or pharmacist before making any medical decisions.
          </div>

        </div>
      )}

    </div>
  );
}

export default Interactions;