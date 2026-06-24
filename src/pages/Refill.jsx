import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

function Refill() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLowStock = async () => {
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
        const list = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((m) => m.quantity && parseInt(m.quantity) <= 5);
        setMedicines(list);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchLowStock();
  }, []);

  // Update quantity after user refills a medicine
  const handleRefill = async (medicine, newQuantity) => {
    if (!newQuantity || isNaN(newQuantity) || parseInt(newQuantity) <= 0) return;
    setUpdating(medicine.id);
    try {
      await updateDoc(doc(db, "medicines", medicine.id), {
        quantity: newQuantity
      });
      setMedicines((prev) =>
        prev.filter((m) => parseInt(m.quantity) <= 5 && m.id !== medicine.id)
      );
    } catch (err) {
      console.error(err);
    }
    setUpdating(null);
  };

  if (loading) {
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <div style={styles.container}>

      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate("/dashboard")}>
          Back
        </button>
        <h1 style={styles.title}>Refill Reminder</h1>
      </div>

      <p style={styles.subtitle}>
        These medicines have 5 or fewer units left and need to be restocked.
      </p>

      {medicines.length === 0 && (
        <div style={styles.emptyState}>
          All medicines are well stocked. No refills needed.
        </div>
      )}

      <div style={styles.list}>
        {medicines.map((medicine) => (
          <RefillCard
            key={medicine.id}
            medicine={medicine}
            updating={updating === medicine.id}
            onRefill={handleRefill}
          />
        ))}
      </div>

    </div>
  );
}

function RefillCard({ medicine, updating, onRefill }) {
  const [newQty, setNewQty] = useState("");

  return (
    <div style={cardStyles.card}>
      <div style={cardStyles.top}>
        <div>
          <div style={cardStyles.name}>{medicine.medicineName}</div>
          <div style={cardStyles.detail}>
            {medicine.brand} · {medicine.dosage}
          </div>
        </div>
        <div style={cardStyles.stockBadge}>
          {medicine.quantity} left
        </div>
      </div>

      <div style={cardStyles.refillRow}>
        <input
          style={cardStyles.input}
          type="number"
          placeholder="New quantity"
          value={newQty}
          onChange={(e) => setNewQty(e.target.value)}
        />
        <button
          style={{
            ...cardStyles.refillBtn,
            opacity: updating ? 0.7 : 1
          }}
          onClick={() => onRefill(medicine, newQty)}
          disabled={updating}
        >
          {updating ? "Saving..." : "Mark refilled"}
        </button>
      </div>
    </div>
  );
}

const cardStyles = {
  card: {
    border: "1px solid #fca5a5",
    borderRadius: "10px",
    padding: "14px",
    background: "#fff8f8",
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  top: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  name: {
    fontSize: "15px",
    fontWeight: "500",
    color: "#111827"
  },
  detail: {
    fontSize: "12px",
    color: "#6b7280",
    marginTop: "3px"
  },
  stockBadge: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#dc2626",
    background: "#fef2f2",
    border: "1px solid #ef4444",
    borderRadius: "6px",
    padding: "3px 10px"
  },
  refillRow: {
    display: "flex",
    gap: "10px"
  },
  input: {
    flex: 1,
    padding: "9px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none"
  },
  refillBtn: {
    padding: "9px 14px",
    background: "#4F46E5",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    whiteSpace: "nowrap"
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
    marginBottom: "8px"
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
  subtitle: {
    fontSize: "13px",
    color: "#6b7280",
    marginBottom: "20px",
    lineHeight: "1.5"
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#6b7280",
    fontSize: "14px",
    border: "1px solid #e5e7eb",
    borderRadius: "10px"
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  }
};

// Need useState import for RefillCard

export default Refill;