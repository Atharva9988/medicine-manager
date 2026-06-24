import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BrowserMultiFormatReader } from "@zxing/library";
import { auth, db } from "../firebase/firebase";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs
} from "firebase/firestore";

function Scanner() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const readerRef = useRef(null);

  const [scanning, setScanning] = useState(true);
  const [scannedCode, setScannedCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [foundSource, setFoundSource] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    medicineName: "",
    brand: "",
    expiryDate: "",
    quantity: "",
    dosage: "",
    category: ""
  });

  useEffect(() => {
    startScanner();
    return () => {
      if (readerRef.current) readerRef.current.reset();
    };
  }, []);

  const startScanner = () => {
    const codeReader = new BrowserMultiFormatReader();
    readerRef.current = codeReader;
    codeReader.decodeFromVideoDevice(null, videoRef.current, (result) => {
      if (result) {
        const code = result.getText();
        setScannedCode(code);
        setScanning(false);
        codeReader.reset();
        lookupBarcode(code);
      }
    });
  };

  const lookupBarcode = async (code) => {
    setLoading(true);
    setNotFound(false);
    setShowForm(false);

    // Step 1: Check your own Firebase database first
    setLoadingMessage("Checking local database...");
    const localResult = await checkLocalDatabase(code);
    if (localResult) {
      setForm((prev) => ({ ...prev, ...localResult }));
      setFoundSource("local");
      setShowForm(true);
      setLoading(false);
      return;
    }

    // Step 2: Try FDA database
    setLoadingMessage("Checking FDA database...");
    const fdaResult = await checkFDA(code);
    if (fdaResult) {
      setForm((prev) => ({ ...prev, ...fdaResult }));
      setFoundSource("fda");
      setShowForm(true);
      setLoading(false);
      return;
    }

    // Step 3: Try Open Food Facts (better Indian product coverage)
    setLoadingMessage("Checking Open Food Facts database...");
    const offResult = await checkOpenFoodFacts(code);
    if (offResult) {
      setForm((prev) => ({ ...prev, ...offResult }));
      setFoundSource("openfoodfacts");
      setShowForm(true);
      setLoading(false);
      return;
    }

    // All three failed
    setNotFound(true);
    setShowForm(true);
    setLoading(false);
    setLoadingMessage("");
  };

  // Check your own Firebase barcode collection
  const checkLocalDatabase = async (code) => {
    try {
      const q = query(
        collection(db, "barcodes"),
        where("barcode", "==", code)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        return {
          medicineName: data.medicineName || "",
          brand: data.brand || "",
          dosage: data.dosage || "",
          category: data.category || ""
        };
      }
    } catch (err) {
      console.error("Local DB error:", err);
    }
    return null;
  };

  // Check FDA drug database
  const checkFDA = async (code) => {
    try {
      const response = await fetch(
        `https://api.fda.gov/drug/ndc.json?search=product_ndc:"${code}"&limit=1`
      );
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          medicineName: result.brand_name || result.generic_name || "",
          brand: result.labeler_name || "",
          dosage: result.dosage_form || "",
          category: result.product_type || ""
        };
      }
    } catch (err) {
      console.error("FDA error:", err);
    }
    return null;
  };

  // Check Open Food Facts database (better Indian coverage)
  const checkOpenFoodFacts = async (code) => {
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${code}.json`
      );
      const data = await response.json();
      if (data.status === 1 && data.product) {
        const product = data.product;
        return {
          medicineName: product.product_name || product.generic_name || "",
          brand: product.brands || "",
          dosage: "",
          category: product.categories || "Other"
        };
      }
    } catch (err) {
      console.error("Open Food Facts error:", err);
    }
    return null;
  };

  // Save barcode to Firebase so future scans find it instantly
  const saveBarcodeToLocalDB = async (code, medicineData) => {
    try {
      await addDoc(collection(db, "barcodes"), {
        barcode: code,
        medicineName: medicineData.medicineName,
        brand: medicineData.brand,
        dosage: medicineData.dosage,
        category: medicineData.category,
        addedBy: auth.currentUser.uid,
        addedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error saving barcode:", err);
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

      // Save medicine to medicines collection
      await addDoc(collection(db, "medicines"), {
        medicineName: form.medicineName,
        brand: form.brand,
        expiryDate: form.expiryDate,
        quantity: form.quantity,
        dosage: form.dosage,
        category: form.category,
        alarmTime: "",
        notes: `Scanned barcode: ${scannedCode}`,
        createdBy: user.uid,
        createdAt: new Date().toISOString()
      });

      // Also save barcode to local database for future scans
      // Only save if it was not already found in local database
      if (foundSource !== "local") {
        await saveBarcodeToLocalDB(scannedCode, form);
      }

      navigate("/dashboard");
    } catch (err) {
      setError("Failed to save. Please try again.");
      console.error(err);
    }
    setSaving(false);
  };

  const handleRescan = () => {
    setScannedCode("");
    setNotFound(false);
    setShowForm(false);
    setFoundSource("");
    setForm({
      medicineName: "",
      brand: "",
      expiryDate: "",
      quantity: "",
      dosage: "",
      category: ""
    });
    setScanning(true);
    startScanner();
  };

  const getSourceLabel = () => {
    if (foundSource === "local") return "Found in your local database";
    if (foundSource === "fda") return "Found in FDA drug database";
    if (foundSource === "openfoodfacts") return "Found in Open Food Facts database";
    return "";
  };

  return (
    <div style={styles.container}>

      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate("/dashboard")}>
          Back
        </button>
        <h1 style={styles.title}>Scan Medicine</h1>
      </div>

      {/* Camera view */}
      <div style={styles.cameraBox}>
        <video ref={videoRef} style={styles.video} />
        {scanning && (
          <div style={styles.scanOverlay}>
            <div style={styles.scanFrame} />
            <p style={styles.scanHint}>Point camera at barcode</p>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={styles.statusBox}>
          {loadingMessage}
        </div>
      )}

      {/* Not found warning */}
      {notFound && !loading && (
        <div style={styles.warningBox}>
          Barcode {scannedCode} not found in any database. Fill in details manually. Your entry will be saved for future scans.
        </div>
      )}

      {/* Found from a database */}
      {foundSource && !loading && (
        <div style={styles.foundBox}>
          {getSourceLabel()}. Review details and fill in expiry date before saving.
        </div>
      )}

      {/* Form */}
      {showForm && !loading && (
        <div style={styles.form}>

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
            <label style={styles.label}>Brand</label>
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
              placeholder="e.g. 500mg"
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

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.buttonRow}>
            <button style={styles.rescanButton} onClick={handleRescan}>
              Rescan
            </button>
            <button
              style={{ ...styles.saveButton, opacity: saving ? 0.7 : 1 }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Medicine"}
            </button>
          </div>

        </div>
      )}

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
  cameraBox: {
    position: "relative",
    width: "100%",
    borderRadius: "12px",
    overflow: "hidden",
    background: "#000",
    marginBottom: "16px",
    aspectRatio: "4/3"
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },
  scanOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px"
  },
  scanFrame: {
    width: "200px",
    height: "120px",
    border: "2px solid #4F46E5",
    borderRadius: "8px"
  },
  scanHint: {
    color: "white",
    fontSize: "13px",
    margin: 0,
    background: "rgba(0,0,0,0.5)",
    padding: "6px 12px",
    borderRadius: "6px"
  },
  statusBox: {
    background: "#f0fdf4",
    border: "1px solid #22c55e",
    borderRadius: "8px",
    padding: "12px 14px",
    fontSize: "13px",
    color: "#15803d",
    marginBottom: "16px"
  },
  warningBox: {
    background: "#fffbeb",
    border: "1px solid #f59e0b",
    borderRadius: "8px",
    padding: "12px 14px",
    fontSize: "13px",
    color: "#92400e",
    marginBottom: "16px"
  },
  foundBox: {
    background: "#eff6ff",
    border: "1px solid #3b82f6",
    borderRadius: "8px",
    padding: "12px 14px",
    fontSize: "13px",
    color: "#1d4ed8",
    marginBottom: "16px"
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
  error: {
    color: "#ef4444",
    fontSize: "13px",
    margin: 0
  },
  buttonRow: {
    display: "flex",
    gap: "10px"
  },
  rescanButton: {
    flex: 1,
    padding: "12px",
    background: "white",
    color: "#4F46E5",
    border: "1px solid #4F46E5",
    borderRadius: "8px",
    fontSize: "14px",
    cursor: "pointer"
  },
  saveButton: {
    flex: 2,
    padding: "12px",
    background: "#4F46E5",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer"
  }
};

export default Scanner;

