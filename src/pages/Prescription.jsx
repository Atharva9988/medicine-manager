import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useTheme } from "../ThemeContext";

function Prescription() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const [medicine, setMedicine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    doctorName: "",
    hospitalName: "",
    prescriptionDate: "",
    notes: ""
  });

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
    const fetchData = async () => {
      try {
        const mRef = doc(db, "medicines", id);
        const mSnap = await getDoc(mRef);
        if (mSnap.exists()) {
          setMedicine({ id: mSnap.id, ...mSnap.data() });
        } else {
          navigate("/dashboard");
          return;
        }

        const pRef = doc(db, "prescriptions", id);
        const pSnap = await getDoc(pRef);
        if (pSnap.exists()) {
          const data = pSnap.data();
          setForm({
            doctorName: data.doctorName || "",
            hospitalName: data.hospitalName || "",
            prescriptionDate: data.prescriptionDate || "",
            notes: data.notes || ""
          });
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.doctorName) {
      setError("Doctor name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const user = auth.currentUser;
      await setDoc(doc(db, "prescriptions", id), {
        medicineId: id,
        medicineName: medicine.medicineName,
        doctorName: form.doctorName,
        hospitalName: form.hospitalName,
        prescriptionDate: form.prescriptionDate,
        notes: form.notes,
        createdBy: user.uid,
        updatedAt: new Date().toISOString()
      });
      navigate(`/medicine/${id}`);
    } catch (err) {
      setError("Failed to save. Please try again.");
      console.error(err);
    }
    setSaving(false);
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

      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
        <button
          style={{ padding: "8px 14px", background: t.card, border: `1px solid ${t.border}`, borderRadius: "8px", fontSize: "13px", cursor: "pointer", color: t.muted }}
          onClick={() => navigate(`/medicine/${id}`)}
        >
          Back
        </button>
        <h1 style={{ fontSize: "20px", fontWeight: "600", margin: 0, color: t.text }}>
          Prescription
        </h1>
      </div>

      <p style={{ fontSize: "13px", color: t.muted, marginBottom: "24px" }}>
        {medicine?.medicineName}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "13px", color: t.text, fontWeight: "500" }}>
            Doctor name <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <input
            style={{ padding: "11px 12px", border: `1px solid ${t.border}`, borderRadius: "8px", fontSize: "14px", outline: "none", background: t.input, color: t.inputText }}
            type="text"
            placeholder="e.g. Dr. Sharma"
            value={form.doctorName}
            onChange={(e) => handleChange("doctorName", e.target.value)}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "13px", color: t.text, fontWeight: "500" }}>
            Hospital / Clinic
          </label>
          <input
            style={{ padding: "11px 12px", border: `1px solid ${t.border}`, borderRadius: "8px", fontSize: "14px", outline: "none", background: t.input, color: t.inputText }}
            type="text"
            placeholder="e.g. Apollo Hospital"
            value={form.hospitalName}
            onChange={(e) => handleChange("hospitalName", e.target.value)}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "13px", color: t.text, fontWeight: "500" }}>
            Prescription date
          </label>
          <input
            style={{ padding: "11px 12px", border: `1px solid ${t.border}`, borderRadius: "8px", fontSize: "14px", outline: "none", background: t.input, color: t.inputText }}
            type="date"
            value={form.prescriptionDate}
            onChange={(e) => handleChange("prescriptionDate", e.target.value)}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "13px", color: t.text, fontWeight: "500" }}>
            Doctor notes
          </label>
          <textarea
            style={{ padding: "11px 12px", border: `1px solid ${t.border}`, borderRadius: "8px", fontSize: "14px", outline: "none", background: t.input, color: t.inputText, minHeight: "80px", resize: "vertical", fontFamily: "sans-serif" }}
            placeholder="e.g. Take twice daily after meals for 5 days"
            value={form.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
          />
        </div>

        <div style={{ background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: "8px", padding: "12px 14px", fontSize: "13px", color: "#92400e" }}>
          Photo upload will be available after Firebase Storage upgrade.
        </div>

        {error && <p style={{ color: "#ef4444", fontSize: "13px", margin: 0 }}>{error}</p>}

        <button
          style={{ padding: "13px", background: "#4F46E5", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "500", cursor: "pointer", opacity: saving ? 0.7 : 1, marginTop: "8px" }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Prescription"}
        </button>

      </div>
    </div>
  );
}

export default Prescription;