import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useTheme } from "../ThemeContext";

function Dashboard() {
  const [medicines, setMedicines] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMember, setFilterMember] = useState("all");
  const navigate = useNavigate();
  const { darkMode, toggleDark } = useTheme();

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
        console.error("Error fetching medicines:", err);
      }
      setLoading(false);
    };
    fetchMedicines();
  }, []);

  useEffect(() => {
    const fetchMembers = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const q = query(
          collection(db, "members"),
          where("createdBy", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        setMembers(list);
      } catch (err) {
        console.error(err);
      }
    };
    fetchMembers();
  }, []);

  const getExpiryStatus = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "expired";
    if (diffDays <= 7) return "soon";
    return "safe";
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const filteredMedicines = medicines.filter((m) => {
    const matchesSearch = m.medicineName
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || getExpiryStatus(m.expiryDate) === filterStatus;
    const matchesCategory =
      filterCategory === "all" || m.category === filterCategory;
    const matchesMember =
      filterMember === "all" ||
      (filterMember === "Self" && (!m.member || m.member === "Self")) ||
      m.member === filterMember;
    return matchesSearch && matchesStatus && matchesCategory && matchesMember;
  });

  const categories = [
    "all",
    ...new Set(medicines.map((m) => m.category).filter(Boolean))
  ];

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px", fontFamily: "sans-serif", color: "#6b7280" }}>
        Loading your medicines...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "24px 16px", fontFamily: "sans-serif", background: t.bg, minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "600", margin: "0 0 4px 0", color: t.text }}>Medicine Manager</h1>
          <p style={{ fontSize: "13px", color: t.muted, margin: 0 }}>{medicines.length} medicines tracked</p>
        </div>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button style={{ padding: "8px 14px", background: "#4F46E5", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "500", cursor: "pointer" }} onClick={() => navigate("/add-medicine")}>+ Add</button>
          <button style={{ padding: "8px 14px", background: t.card, color: "#059669", border: "1px solid #059669", borderRadius: "8px", fontSize: "13px", fontWeight: "500", cursor: "pointer" }} onClick={() => navigate("/scanner")}>Scan</button>
          <button style={{ padding: "8px 14px", background: t.card, color: "#4F46E5", border: "1px solid #4F46E5", borderRadius: "8px", fontSize: "13px", fontWeight: "500", cursor: "pointer" }} onClick={() => navigate("/alarms")}>Alarms</button>
          <button style={{ padding: "8px 14px", background: t.card, color: "#0891b2", border: "1px solid #0891b2", borderRadius: "8px", fontSize: "13px", fontWeight: "500", cursor: "pointer" }} onClick={() => navigate("/history")}>Today</button>
          <button style={{ padding: "8px 14px", background: t.card, color: "#7c3aed", border: "1px solid #7c3aed", borderRadius: "8px", fontSize: "13px", fontWeight: "500", cursor: "pointer" }} onClick={() => navigate("/export")}>Export</button>
          <button style={{ padding: "8px 14px", background: t.card, color: "#dc2626", border: "1px solid #dc2626", borderRadius: "8px", fontSize: "13px", fontWeight: "500", cursor: "pointer" }} onClick={() => navigate("/pharmacy")}>Pharmacy</button>
          <button style={{ padding: "8px 14px", background: t.card, color: "#b45309", border: "1px solid #b45309", borderRadius: "8px", fontSize: "13px", fontWeight: "500", cursor: "pointer" }} onClick={() => navigate("/interactions")}>Interactions</button>
          <button style={{ padding: "8px 14px", background: t.card, color: t.muted, border: `1px solid ${t.border}`, borderRadius: "8px", fontSize: "13px", cursor: "pointer" }} onClick={toggleDark}>{darkMode ? "Light" : "Dark"}</button>
          <button style={{ padding: "8px 14px", background: t.card, color: t.muted, border: `1px solid ${t.border}`, borderRadius: "8px", fontSize: "13px", cursor: "pointer" }} onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <div style={{ flex: 1, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "12px 8px", textAlign: "center", background: t.card }}>
          <div style={{ fontSize: "22px", fontWeight: "600", color: t.text }}>{medicines.length}</div>
          <div style={{ fontSize: "11px", color: t.muted, marginTop: "2px" }}>Total</div>
        </div>
        <div style={{ flex: 1, border: "1px solid #ef4444", borderRadius: "10px", padding: "12px 8px", textAlign: "center", background: t.card }}>
          <div style={{ fontSize: "22px", fontWeight: "600", color: "#ef4444" }}>{medicines.filter(m => getExpiryStatus(m.expiryDate) === "expired").length}</div>
          <div style={{ fontSize: "11px", color: t.muted, marginTop: "2px" }}>Expired</div>
        </div>
        <div style={{ flex: 1, border: "1px solid #f59e0b", borderRadius: "10px", padding: "12px 8px", textAlign: "center", background: t.card }}>
          <div style={{ fontSize: "22px", fontWeight: "600", color: "#f59e0b" }}>{medicines.filter(m => getExpiryStatus(m.expiryDate) === "soon").length}</div>
          <div style={{ fontSize: "11px", color: t.muted, marginTop: "2px" }}>Expiring soon</div>
        </div>
        <div style={{ flex: 1, border: "1px solid #22c55e", borderRadius: "10px", padding: "12px 8px", textAlign: "center", background: t.card }}>
          <div style={{ fontSize: "22px", fontWeight: "600", color: "#22c55e" }}>{medicines.filter(m => getExpiryStatus(m.expiryDate) === "safe").length}</div>
          <div style={{ fontSize: "11px", color: t.muted, marginTop: "2px" }}>Safe</div>
        </div>
      </div>

      {/* Search */}
      <input
        style={{ width: "100%", padding: "11px 12px", border: `1px solid ${t.border}`, borderRadius: "8px", fontSize: "14px", outline: "none", marginBottom: "10px", boxSizing: "border-box", background: t.input, color: t.inputText }}
        type="text"
        placeholder="Search medicines..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <select style={{ flex: 1, minWidth: "120px", padding: "10px 12px", border: `1px solid ${t.border}`, borderRadius: "8px", fontSize: "13px", outline: "none", background: t.input, color: t.inputText, cursor: "pointer" }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All status</option>
          <option value="safe">Safe</option>
          <option value="soon">Expiring soon</option>
          <option value="expired">Expired</option>
        </select>
        <select style={{ flex: 1, minWidth: "120px", padding: "10px 12px", border: `1px solid ${t.border}`, borderRadius: "8px", fontSize: "13px", outline: "none", background: t.input, color: t.inputText, cursor: "pointer" }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat === "all" ? "All categories" : cat}</option>
          ))}
        </select>
        <select style={{ flex: 1, minWidth: "120px", padding: "10px 12px", border: `1px solid ${t.border}`, borderRadius: "8px", fontSize: "13px", outline: "none", background: t.input, color: t.inputText, cursor: "pointer" }} value={filterMember} onChange={(e) => setFilterMember(e.target.value)}>
          <option value="all">All members</option>
          <option value="Self">Self</option>
          {members.map((m) => (
            <option key={m.id} value={m.name}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Refill banner */}
      {medicines.some(m => m.quantity && parseInt(m.quantity) <= 5) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fef2f2", border: "1px solid #ef4444", borderRadius: "8px", padding: "12px 14px", marginBottom: "12px" }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "600", color: "#dc2626" }}>Medicines need refill</div>
            <div style={{ fontSize: "12px", color: t.muted }}>
              {medicines.filter(m => m.quantity && parseInt(m.quantity) <= 5).map(m => m.medicineName).join(", ")}
            </div>
          </div>
          <button style={{ padding: "7px 14px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "500", cursor: "pointer" }} onClick={() => navigate("/refill")}>View</button>
        </div>
      )}

      {/* Warning banner */}
      {medicines.some(m => getExpiryStatus(m.expiryDate) === "soon" || getExpiryStatus(m.expiryDate) === "expired") && (
        <div style={{ background: "#fffbeb", border: "1px solid #f59e0b", borderRadius: "8px", padding: "12px 14px", fontSize: "13px", color: "#92400e", marginBottom: "16px" }}>
          Some medicines need your attention. Check expiry dates below.
        </div>
      )}

      {/* Empty state */}
      {medicines.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: t.muted, fontSize: "14px" }}>
          <p>No medicines added yet.</p>
          <button style={{ padding: "10px 20px", background: "#4F46E5", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", cursor: "pointer", marginTop: "12px" }} onClick={() => navigate("/add-medicine")}>Add your first medicine</button>
        </div>
      )}

      {/* No results */}
      {medicines.length > 0 && filteredMedicines.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: t.muted, fontSize: "14px" }}>
          <p>No medicines match your search or filter.</p>
          <button style={{ padding: "10px 20px", background: t.card, color: "#4F46E5", border: "1px solid #4F46E5", borderRadius: "8px", fontSize: "14px", cursor: "pointer", marginTop: "12px" }} onClick={() => { setSearch(""); setFilterStatus("all"); setFilterCategory("all"); setFilterMember("all"); }}>Clear filters</button>
        </div>
      )}

      {/* Medicine list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {filteredMedicines.map((medicine) => {
          const status = getExpiryStatus(medicine.expiryDate);
          const isLowStock = medicine.quantity && parseInt(medicine.quantity) <= 5;
          return (
            <div
              key={medicine.id}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px", border: `1px solid ${status === "expired" ? "#ef4444" : status === "soon" ? "#f59e0b" : t.border}`, borderRadius: "10px", cursor: "pointer", background: t.card }}
              onClick={() => navigate(`/medicine/${medicine.id}`)}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ fontSize: "15px", fontWeight: "500", color: t.text }}>{medicine.medicineName}</div>
                <div style={{ fontSize: "12px", color: t.muted }}>{medicine.brand} · {medicine.dosage} · {medicine.quantity} left</div>
                <div style={{ fontSize: "11px", color: "#4F46E5" }}>{medicine.member || "Self"}</div>
                {isLowStock && (
                  <div style={{ fontSize: "11px", color: "#dc2626", background: "#fef2f2", border: "1px solid #ef4444", borderRadius: "4px", padding: "2px 6px", alignSelf: "flex-start" }}>Low stock</div>
                )}
              </div>
              <div style={{ fontSize: "11px", fontWeight: "500", border: `1px solid ${status === "expired" ? "#ef4444" : status === "soon" ? "#f59e0b" : t.border}`, borderRadius: "6px", padding: "3px 8px", whiteSpace: "nowrap", color: status === "expired" ? "#ef4444" : status === "soon" ? "#f59e0b" : t.muted }}>
                {status === "expired" ? "Expired" : status === "soon" ? "Expiring soon" : medicine.expiryDate}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

export default Dashboard;