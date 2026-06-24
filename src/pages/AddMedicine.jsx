import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { useEffect } from "react";

function AddMedicine() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [newMember, setNewMember] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);

  const [form, setForm] = useState({
    medicineName: "",
    brand: "",
    expiryDate: "",
    quantity: "",
    dosage: "",
    category: "",
    alarmTime: "",
    notes: "",
    member: ""
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch existing family members
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

  const handleAddMember = async () => {
    if (!newMember.trim()) return;
    const user = auth.currentUser;
    try {
      const docRef = await addDoc(collection(db, "members"), {
        name: newMember.trim(),
        createdBy: user.uid,
        createdAt: new Date().toISOString()
      });
      const added = { id: docRef.id, name: newMember.trim() };
      setMembers((prev) => [...prev, added]);
      setForm((prev) => ({ ...prev, member: newMember.trim() }));
      setNewMember("");
      setShowAddMember(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.medicineName || !form.expiryDate) {
      setError("Medicine name and expiry date are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, "medicines"), {
        medicineName: form.medicineName,
        brand: form.brand,
        expiryDate: form.expiryDate,
        quantity: form.quantity,
        dosage: form.dosage,
        category: form.category,
        alarmTime: form.alarmTime,
        notes: form.notes,
        member: form.member || "Self",
        createdBy: user.uid,
        createdAt: new Date().toISOString()
      });
      navigate("/dashboard");
    } catch (err) {
      setError("Failed to save. Please try again.");
      console.error(err);
    }
    setSaving(false);
  };

  return (
    <div style={styles.container}>

      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate("/dashboard")}>
          Back
        </button>
        <h1 style={styles.title}>Add Medicine</h1>
      </div>

      <div style={styles.form}>

        {/* Family member selector */}
        <div style={styles.field}>
          <label style={styles.label}>For family member</label>
          <select
            style={styles.input}
            value={form.member}
            onChange={(e) => {
              if (e.target.value === "__add__") {
                setShowAddMember(true);
              } else {
                handleChange("member", e.target.value);
              }
            }}
          >
            <option value="">Self</option>
            {members.map((m) => (
              <option key={m.id} value={m.name}>{m.name}</option>
            ))}
            <option value="__add__">+ Add new member</option>
          </select>

          {showAddMember && (
            <div style={styles.addMemberRow}>
              <input
                style={{ ...styles.input, flex: 1 }}
                type="text"
                placeholder="Member name e.g. Mom"
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
              />
              <button style={styles.addMemberBtn} onClick={handleAddMember}>
                Add
              </button>
              <button style={styles.cancelMemberBtn} onClick={() => setShowAddMember(false)}>
                Cancel
              </button>
            </div>
          )}
        </div>

        <div style={styles.field}>
          <label style={styles.label}>
            Medicine name <span style={styles.required}>*</span>
          </label>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. Dolo 650"
            value={form.medicineName}
            onChange={(e) => handleChange("medicineName", e.target.value)}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Brand / Manufacturer</label>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. Micro Labs"
            value={form.brand}
            onChange={(e) => handleChange("brand", e.target.value)}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>
            Expiry date <span style={styles.required}>*</span>
          </label>
          <input
            style={styles.input}
            type="date"
            value={form.expiryDate}
            onChange={(e) => handleChange("expiryDate", e.target.value)}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Quantity</label>
          <input
            style={styles.input}
            type="number"
            placeholder="e.g. 10"
            value={form.quantity}
            onChange={(e) => handleChange("quantity", e.target.value)}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Dosage</label>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g. 500mg or 1 tablet"
            value={form.dosage}
            onChange={(e) => handleChange("dosage", e.target.value)}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Category</label>
          <select
            style={styles.input}
            value={form.category}
            onChange={(e) => handleChange("category", e.target.value)}
          >
            <option value="">Select category</option>
            <option value="Painkiller">Painkiller</option>
            <option value="Antibiotic">Antibiotic</option>
            <option value="Vitamin">Vitamin</option>
            <option value="Antacid">Antacid</option>
            <option value="Antihistamine">Antihistamine</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Daily alarm time</label>
          <input
            style={styles.input}
            type="time"
            value={form.alarmTime}
            onChange={(e) => handleChange("alarmTime", e.target.value)}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Notes</label>
          <textarea
            style={{ ...styles.input, minHeight: "80px", resize: "vertical" }}
            placeholder="e.g. Take after meals"
            value={form.notes}
            onChange={(e) => handleChange("notes", e.target.value)}
          />
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button
          style={{ ...styles.saveButton, opacity: saving ? 0.7 : 1 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Medicine"}
        </button>

      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "480px",
    margin: "0 auto",
    padding: "24px 16px",
    fontFamily: "sans-serif"
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px"
  },
  backButton: {
    padding: "8px 14px",
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "13px",
    cursor: "pointer",
    color: "#6b7280"
  },
  title: {
    fontSize: "20px",
    fontWeight: "600",
    margin: 0
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  label: {
    fontSize: "13px",
    color: "#374151",
    fontWeight: "500"
  },
  required: {
    color: "#ef4444"
  },
  input: {
    padding: "11px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    fontFamily: "sans-serif"
  },
  addMemberRow: {
    display: "flex",
    gap: "8px",
    marginTop: "8px"
  },
  addMemberBtn: {
    padding: "10px 14px",
    background: "#4F46E5",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    cursor: "pointer",
    fontWeight: "500"
  },
  cancelMemberBtn: {
    padding: "10px 14px",
    background: "white",
    color: "#6b7280",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "13px",
    cursor: "pointer"
  },
  error: {
    color: "#ef4444",
    fontSize: "13px",
    margin: 0
  },
  saveButton: {
    padding: "13px",
    background: "#4F46E5",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    marginTop: "8px"
  }
};

export default AddMedicine;