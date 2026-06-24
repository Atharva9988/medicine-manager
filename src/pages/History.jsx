import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc
} from "firebase/firestore";
import { useTheme } from "../ThemeContext";

function History() {
  const [medicines, setMedicines] = useState([]);
  const [takenToday, setTakenToday] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  const today = new Date().toISOString().split("T")[0];

  const t = {
    bg: darkMode ? "#111827" : "#ffffff",
    card: darkMode ? "#1f2937" : "#ffffff",
    border: darkMode ? "#374151" : "#e5e7eb",
    text: darkMode ? "#f9fafb" : "#111827",
    muted: darkMode ? "#9ca3af" : "#6b7280"
  };

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/");
        return;
      }
      try {
        // Fetch all medicines
        const mq = query(
          collection(db, "medicines"),
          where("createdBy", "==", user.uid)
        );
        const mSnap = await getDocs(mq);
        const mList = mSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        setMedicines(mList);

        // Fetch today's taken log
        const hq = query(
          collection(db, "history"),
          where("createdBy", "==", user.uid),
          where("date", "==", today)
        );
        const hSnap = await getDocs(hq);
        const hList = hSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        setTakenToday(hList);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const isTaken = (medicineId) => {
    return takenToday.some((h) => h.medicineId === medicineId);
  };

  const getLogId = (medicineId) => {
    const log = takenToday.find((h) => h.medicineId === medicineId);
    return log ? log.id : null;
  };

  const handleToggle = async (medicine) => {
    const user = auth.currentUser;
    const taken = isTaken(medicine.id);

    if (taken) {
      // Remove from taken
      const logId = getLogId(medicine.id);
      try {
        await deleteDoc(doc(db, "history", logId));
        setTakenToday((prev) => prev.filter((h) => h.id !== logId));
      } catch (err) {
        console.error(err);
      }
    } else {
      // Mark as taken
      try {
        const docRef = await addDoc(collection(db, "history"), {
          medicineId: medicine.id,
          medicineName: medicine.medicineName,
          dosage: medicine.dosage,
          member: medicine.member || "Self",
          date: today,
          takenAt: new Date().toISOString(),
          createdBy: user.uid
        });
        setTakenToday((prev) => [
          ...prev,
          {
            id: docRef.id,
            medicineId: medicine.id,
            date: today
          }
        ]);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const takenCount = medicines.filter((m) => isTaken(m.id)).length;
  const totalCount = medicines.length;

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
          Today's Log
        </h1>
      </div>

      <p style={{ fontSize: "13px", color: t.muted, marginBottom: "20px" }}>
        {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </p>

      {/* Progress bar */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
          <span style={{ fontSize: "13px", color: t.muted }}>Medicines taken today</span>
          <span style={{ fontSize: "13px", fontWeight: "600", color: takenCount === totalCount ? "#22c55e" : t.text }}>
            {takenCount} / {totalCount}
          </span>
        </div>
        <div style={{ height: "8px", background: t.border, borderRadius: "4px", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: totalCount > 0 ? `${(takenCount / totalCount) * 100}%` : "0%",
            background: takenCount === totalCount ? "#22c55e" : "#4F46E5",
            borderRadius: "4px",
            transition: "width 0.3s"
          }} />
        </div>
        {takenCount === totalCount && totalCount > 0 && (
          <p style={{ fontSize: "13px", color: "#22c55e", marginTop: "8px", textAlign: "center", fontWeight: "500" }}>
            All medicines taken for today.
          </p>
        )}
      </div>

      {/* Medicine checklist */}
      {medicines.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: t.muted, fontSize: "14px" }}>
          <p>No medicines added yet.</p>
          <button
            style={{ padding: "10px 20px", background: "#4F46E5", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer", marginTop: "12px" }}
            onClick={() => navigate("/add-medicine")}
          >
            Add a medicine
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {medicines.map((medicine) => {
          const taken = isTaken(medicine.id);
          return (
            <div
              key={medicine.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "14px",
                border: `1px solid ${taken ? "#22c55e" : t.border}`,
                borderRadius: "10px",
                background: taken ? (darkMode ? "#052e16" : "#f0fdf4") : t.card,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onClick={() => handleToggle(medicine)}
            >
              {/* Checkbox */}
              <div style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                border: `2px solid ${taken ? "#22c55e" : t.border}`,
                background: taken ? "#22c55e" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.2s"
              }}>
                {taken && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>

              {/* Medicine info */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: "15px",
                  fontWeight: "500",
                  color: taken ? "#15803d" : t.text,
                  textDecoration: taken ? "line-through" : "none"
                }}>
                  {medicine.medicineName}
                </div>
                <div style={{ fontSize: "12px", color: t.muted, marginTop: "2px" }}>
                  {medicine.dosage} · {medicine.member || "Self"}
                </div>
                {medicine.alarmTime && (
                  <div style={{ fontSize: "11px", color: "#4F46E5", marginTop: "2px" }}>
                    Scheduled at {formatTime(medicine.alarmTime)}
                  </div>
                )}
              </div>

              {/* Status label */}
              <div style={{
                fontSize: "11px",
                fontWeight: "500",
                color: taken ? "#15803d" : t.muted,
                whiteSpace: "nowrap"
              }}>
                {taken ? "Taken" : "Pending"}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

function formatTime(time) {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export default History;