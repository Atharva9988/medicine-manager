import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../firebase/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";

function MedicineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [medicine, setMedicine] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch this specific medicine from Firebase
  useEffect(() => {
    const fetchMedicine = async () => {
      try {
        const ref = doc(db, "medicines", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() };
          setMedicine(data);
          setForm(data);
        } else {
          navigate("/dashboard");
        }
      } catch (err) {
        console.error(err);
        navigate("/dashboard");
      }
      setLoading(false);
    };
    fetchMedicine();
  }, [id]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Save edited medicine back to Firebase
  const handleSave = async () => {
    setSaving(true);
    try {
      const ref = doc(db, "medicines", id);
      await updateDoc(ref, {
        medicineName: form.medicineName,
        brand: form.brand,
        expiryDate: form.expiryDate,
        quantity: form.quantity,
        dosage: form.dosage,
        category: form.category,
        alarmTime: form.alarmTime,
        notes: form.notes
      });
      setMedicine(form);
      setEditing(false);
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  // Delete medicine from Firebase
  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this medicine?"
    );
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, "medicines", id));
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
    }
  };

  const getExpiryStatus = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "expired";
    if (diffDays <= 7) return "soon";
    return "safe";
  };

  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  const status = getExpiryStatus(medicine.expiryDate);

  return (
    <div style={styles.container}>

      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate("/dashboard")}>
          Back
        </button>
        <h1 style={styles.title}>
          {editing ? "Edit Medicine" : "Medicine Detail"}
        </h1>
      </div>

      {/* Expiry status banner */}
      {!editing && (
        <div style={{
          ...styles.statusBanner,
          background:
            status === "expired" ? "#fef2f2" :
            status === "soon" ? "#fffbeb" :
            "#f0fdf4",
          borderColor:
            status === "expired" ? "#ef4444" :
            status === "soon" ? "#f59e0b" :
            "#22c55e",
          color:
            status === "expired" ? "#dc2626" :
            status === "soon" ? "#92400e" :
            "#15803d"
        }}>
          {status === "expired"
            ? "This medicine has expired. Please dispose of it safely."
            : status === "soon"
            ? "This medicine is expiring within 7 days."
            : "This medicine is within safe expiry date."}
        </div>
      )}

      {/* View mode */}
      {!editing && (
        <div style={styles.detailBlock}>
          <Row label="Medicine name" value={medicine.medicineName} />
          <Row label="Brand" value={medicine.brand} />
          <Row label="Expiry date" value={medicine.expiryDate} />
          <Row label="Quantity" value={medicine.quantity} />
          <Row label="Dosage" value={medicine.dosage} />
          <Row label="Category" value={medicine.category} />
          <Row label="Alarm time" value={medicine.alarmTime} />
          <Row label="Notes" value={medicine.notes} />
        </div>
      )}

      {/* Edit mode */}
      {editing && (
        <div style={styles.form}>
          <Field label="Medicine name" required>
            <input
              style={styles.input}
              value={form.medicineName}
              onChange={(e) => handleChange("medicineName", e.target.value)}
            />
          </Field>
          <Field label="Brand">
            <input
              style={styles.input}
              value={form.brand}
              onChange={(e) => handleChange("brand", e.target.value)}
            />
          </Field>
          <Field label="Expiry date" required>
            <input
              style={styles.input}
              type="date"
              value={form.expiryDate}
              onChange={(e) => handleChange("expiryDate", e.target.value)}
            />
          </Field>
          <Field label="Quantity">
            <input
              style={styles.input}
              type="number"
              value={form.quantity}
              onChange={(e) => handleChange("quantity", e.target.value)}
            />
          </Field>
          <Field label="Dosage">
            <input
              style={styles.input}
              value={form.dosage}
              onChange={(e) => handleChange("dosage", e.target.value)}
            />
          </Field>
          <Field label="Category">
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
          </Field>
          <Field label="Alarm time">
            <input
              style={styles.input}
              type="time"
              value={form.alarmTime}
              onChange={(e) => handleChange("alarmTime", e.target.value)}
            />
          </Field>
          <Field label="Notes">
            <textarea
              style={{ ...styles.input, minHeight: "80px" }}
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
            />
          </Field>
        </div>
      )}

      {/* Action buttons */}
      <div style={styles.actions}>
  {!editing ? (
    <>
      <button style={styles.editButton} onClick={() => setEditing(true)}>
        Edit
      </button>
      <button
        style={{ ...styles.editButton, background: "#0891b2" }}
        onClick={() => navigate(`/prescription/${id}`)}
      >
        Prescription
      </button>
      <button style={styles.deleteButton} onClick={handleDelete}>
        Delete
      </button>
    </>
        ) : (
          <>
            <button
              style={{ ...styles.editButton, opacity: saving ? 0.7 : 1 }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button
              style={styles.cancelButton}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </>
        )}
      </div>

    </div>
  );
}

// Small helper component for displaying a label and value row
function Row({ label, value }) {
  return (
    <div style={rowStyles.row}>
      <span style={rowStyles.label}>{label}</span>
      <span style={rowStyles.value}>{value || "Not specified"}</span>
    </div>
  );
}

// Small helper component for edit form fields
function Field({ label, required, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "13px", color: "#374151", fontWeight: "500" }}>
        {label} {required && <span style={{ color: "#ef4444" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const rowStyles = {
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "12px 0",
    borderBottom: "1px solid #f3f4f6"
  },
  label: {
    fontSize: "13px",
    color: "#6b7280",
    fontWeight: "500",
    minWidth: "120px"
  },
  value: {
    fontSize: "14px",
    color: "#111827",
    textAlign: "right"
  }
};

const styles = {
  container: {
    maxWidth: "480px",
    margin: "0 auto",
    padding: "24px 16px",
    fontFamily: "sans-serif"
  },
  loading: {
    textAlign: "center",
    marginTop: "100px",
    fontFamily: "sans-serif",
    color: "#6b7280"
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "20px"
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
  statusBanner: {
    border: "1px solid",
    borderRadius: "8px",
    padding: "12px 14px",
    fontSize: "13px",
    marginBottom: "20px"
  },
  detailBlock: {
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "0 16px",
    marginBottom: "24px"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    marginBottom: "24px"
  },
  input: {
    padding: "11px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    fontFamily: "sans-serif"
  },
  actions: {
    display: "flex",
    gap: "10px"
  },
  editButton: {
    flex: 1,
    padding: "12px",
    background: "#4F46E5",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer"
  },
  deleteButton: {
    flex: 1,
    padding: "12px",
    background: "white",
    color: "#ef4444",
    border: "1px solid #ef4444",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer"
  },
  cancelButton: {
    flex: 1,
    padding: "12px",
    background: "white",
    color: "#6b7280",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer"
  }
};

export default MedicineDetail;
