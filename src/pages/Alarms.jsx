import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc
} from "firebase/firestore";

function Alarms() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

  const toggleAlarm = async (medicine) => {
    const newState = !medicine.alarmActive;
    try {
      await updateDoc(doc(db, "medicines", medicine.id), {
        alarmActive: newState
      });
      setMedicines((prev) =>
        prev.map((m) =>
          m.id === medicine.id ? { ...m, alarmActive: newState } : m
        )
      );
      if (newState && Notification.permission !== "granted") {
        await Notification.requestPermission();
      }
      if (newState && Notification.permission === "granted" && medicine.alarmTime) {
        scheduleNotification(medicine);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const scheduleNotification = (medicine) => {
    const now = new Date();
    const [hours, minutes] = medicine.alarmTime.split(":");
    const alarmDate = new Date();
    alarmDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    if (alarmDate <= now) {
      alarmDate.setDate(alarmDate.getDate() + 1);
    }
    const delay = alarmDate - now;
    setTimeout(() => {
      new Notification("Medicine Reminder", {
        body: `Time to take ${medicine.medicineName} - ${medicine.dosage}`,
        icon: "/favicon.svg"
      });
    }, delay);
  };

  const medicinesWithAlarm = medicines.filter((m) => m.alarmTime);
  const medicinesWithoutAlarm = medicines.filter((m) => !m.alarmTime);

  if (loading) {
    return <div style={styles.loading}>Loading alarms...</div>;
  }

  return (
    <div style={styles.container}>

      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate("/dashboard")}>
          Back
        </button>
        <h1 style={styles.title}>Medicine Alarms</h1>
      </div>

      <p style={styles.subtitle}>
        Daily reminders for your medicines. Keep your browser open for notifications to work.
      </p>

      {medicinesWithAlarm.length > 0 && (
        <>
          <div style={styles.sectionLabel}>Alarms set</div>
          <div style={styles.list}>
            {medicinesWithAlarm.map((medicine) => (
              <div key={medicine.id} style={styles.card}>
                <div style={styles.cardLeft}>
                  <div style={styles.medicineName}>{medicine.medicineName}</div>
                  <div style={styles.alarmTime}>
                    Every day at {formatTime(medicine.alarmTime)}
                  </div>
                </div>
                <div style={styles.toggleSection}>
                  <div
                    style={{
                      ...styles.toggleTrack,
                      background: medicine.alarmActive ? "#4F46E5" : "#e5e7eb"
                    }}
                    onClick={() => toggleAlarm(medicine)}
                  >
                    <div
                      style={{
                        ...styles.toggleThumb,
                        transform: medicine.alarmActive
                          ? "translateX(16px)"
                          : "translateX(0px)"
                      }}
                    />
                  </div>
                  <div style={{
                    ...styles.toggleLabel,
                    color: medicine.alarmActive ? "#4F46E5" : "#6b7280"
                  }}>
                    {medicine.alarmActive ? "On" : "Off"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {medicinesWithoutAlarm.length > 0 && (
        <>
          <div style={{ ...styles.sectionLabel, marginTop: "24px" }}>
            No alarm set
          </div>
          <div style={styles.list}>
            {medicinesWithoutAlarm.map((medicine) => (
              <div key={medicine.id} style={{ ...styles.card, opacity: 0.6 }}>
                <div style={styles.cardLeft}>
                  <div style={styles.medicineName}>{medicine.medicineName}</div>
                  <div style={styles.alarmTime}>No alarm time set</div>
                </div>
                <button
                  style={styles.setAlarmButton}
                  onClick={() => navigate(`/medicine/${medicine.id}`)}
                >
                  Set alarm
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {medicines.length === 0 && (
        <div style={styles.emptyState}>
          <p>No medicines added yet.</p>
          <button
            style={styles.addButton}
            onClick={() => navigate("/add-medicine")}
          >
            Add a medicine
          </button>
        </div>
      )}

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
  sectionLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "10px"
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  card: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px",
    border: "1px solid #e5e7eb",
    borderRadius: "10px"
  },
  cardLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  medicineName: {
    fontSize: "15px",
    fontWeight: "500",
    color: "#111827"
  },
  alarmTime: {
    fontSize: "12px",
    color: "#6b7280"
  },
  toggleSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px"
  },
  toggleTrack: {
    width: "36px",
    height: "20px",
    borderRadius: "10px",
    position: "relative",
    cursor: "pointer",
    transition: "background 0.2s"
  },
  toggleThumb: {
    position: "absolute",
    top: "2px",
    left: "2px",
    width: "16px",
    height: "16px",
    background: "white",
    borderRadius: "50%",
    transition: "transform 0.2s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
  },
  toggleLabel: {
    fontSize: "11px",
    fontWeight: "500"
  },
  setAlarmButton: {
    padding: "7px 12px",
    background: "white",
    border: "1px solid #4F46E5",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#4F46E5",
    cursor: "pointer",
    fontWeight: "500"
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    color: "#6b7280",
    fontSize: "14px"
  },
  addButton: {
    padding: "10px 20px",
    background: "#4F46E5",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer",
    marginTop: "12px"
  }
};

export default Alarms;