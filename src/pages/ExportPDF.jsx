import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useTheme } from "../ThemeContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function ExportPDF() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filterMember, setFilterMember] = useState("all");
  const [members, setMembers] = useState([]);
  const navigate = useNavigate();
  const { darkMode } = useTheme();

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

        const memq = query(
          collection(db, "members"),
          where("createdBy", "==", user.uid)
        );
        const memSnap = await getDocs(memq);
        const memList = memSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        setMembers(memList);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const getExpiryStatus = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "Expired";
    if (diffDays <= 7) return "Expiring soon";
    return "Safe";
  };

  const filteredMedicines = medicines.filter((m) => {
    if (filterMember === "all") return true;
    if (filterMember === "Self") return !m.member || m.member === "Self";
    return m.member === filterMember;
  });

  const generatePDF = () => {
    setGenerating(true);

    const pdf = new jsPDF();
    const today = new Date().toLocaleDateString("en-IN");

    // Title
    pdf.setFontSize(20);
    pdf.setTextColor(40, 40, 40);
    pdf.text("Medicine Manager", 14, 20);

    // Subtitle
    pdf.setFontSize(11);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Medicine Report - Generated on ${today}`, 14, 30);

    if (filterMember !== "all") {
      pdf.text(`Member: ${filterMember}`, 14, 38);
    }

    // Summary row
    const expired = filteredMedicines.filter(m => getExpiryStatus(m.expiryDate) === "Expired").length;
    const soon = filteredMedicines.filter(m => getExpiryStatus(m.expiryDate) === "Expiring soon").length;
    const safe = filteredMedicines.filter(m => getExpiryStatus(m.expiryDate) === "Safe").length;

    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    pdf.text(`Total: ${filteredMedicines.length}   Safe: ${safe}   Expiring soon: ${soon}   Expired: ${expired}`, 14, 48);

    // Table
    autoTable(pdf, {
      startY: 56,
      head: [["Medicine", "Brand", "Dosage", "Quantity", "Expiry Date", "Status", "Member"]],
      body: filteredMedicines.map((m) => [
        m.medicineName || "",
        m.brand || "",
        m.dosage || "",
        m.quantity || "",
        m.expiryDate || "",
        getExpiryStatus(m.expiryDate),
        m.member || "Self"
      ]),
      styles: {
        fontSize: 9,
        cellPadding: 4
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: "bold"
      },
      bodyStyles: {
        textColor: 40
      },
      alternateRowStyles: {
        fillColor: [245, 245, 255]
      },
      columnStyles: {
        5: {
          fontStyle: "bold"
        }
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 5) {
          const status = data.cell.raw;
          if (status === "Expired") {
            data.cell.styles.textColor = [220, 38, 38];
          } else if (status === "Expiring soon") {
            data.cell.styles.textColor = [180, 117, 23];
          } else {
            data.cell.styles.textColor = [34, 197, 94];
          }
        }
      }
    });

    // Footer
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text(
        `Medicine Manager App - Page ${i} of ${pageCount}`,
        14,
        pdf.internal.pageSize.height - 10
      );
    }

    pdf.save(`medicines_${today.replace(/\//g, "-")}.pdf`);
    setGenerating(false);
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
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <button
          style={{ padding: "8px 14px", background: t.card, border: `1px solid ${t.border}`, borderRadius: "8px", fontSize: "13px", cursor: "pointer", color: t.muted }}
          onClick={() => navigate("/dashboard")}
        >
          Back
        </button>
        <h1 style={{ fontSize: "20px", fontWeight: "600", margin: 0, color: t.text }}>
          Export to PDF
        </h1>
      </div>

      {/* Summary */}
      <div style={{ border: `1px solid ${t.border}`, borderRadius: "10px", padding: "16px", marginBottom: "20px", background: t.card }}>
        <div style={{ fontSize: "14px", fontWeight: "500", color: t.text, marginBottom: "12px" }}>
          Report summary
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ fontSize: "13px", color: t.muted }}>
            Total: <span style={{ fontWeight: "600", color: t.text }}>{filteredMedicines.length}</span>
          </div>
          <div style={{ fontSize: "13px", color: t.muted }}>
            Safe: <span style={{ fontWeight: "600", color: "#22c55e" }}>{filteredMedicines.filter(m => getExpiryStatus(m.expiryDate) === "Safe").length}</span>
          </div>
          <div style={{ fontSize: "13px", color: t.muted }}>
            Expiring soon: <span style={{ fontWeight: "600", color: "#f59e0b" }}>{filteredMedicines.filter(m => getExpiryStatus(m.expiryDate) === "Expiring soon").length}</span>
          </div>
          <div style={{ fontSize: "13px", color: t.muted }}>
            Expired: <span style={{ fontWeight: "600", color: "#ef4444" }}>{filteredMedicines.filter(m => getExpiryStatus(m.expiryDate) === "Expired").length}</span>
          </div>
        </div>
      </div>

      {/* Filter by member */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" }}>
        <label style={{ fontSize: "13px", color: t.text, fontWeight: "500" }}>
          Filter by family member
        </label>
        <select
          style={{ padding: "11px 12px", border: `1px solid ${t.border}`, borderRadius: "8px", fontSize: "14px", outline: "none", background: t.card, color: t.text, cursor: "pointer" }}
          value={filterMember}
          onChange={(e) => setFilterMember(e.target.value)}
        >
          <option value="all">All members</option>
          <option value="Self">Self</option>
          {members.map((m) => (
            <option key={m.id} value={m.name}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Medicine preview list */}
      <div style={{ fontSize: "13px", color: t.muted, marginBottom: "10px" }}>
        {filteredMedicines.length} medicines will be included in the PDF
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
        {filteredMedicines.map((medicine) => {
          const status = getExpiryStatus(medicine.expiryDate);
          return (
            <div
              key={medicine.id}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", border: `1px solid ${t.border}`, borderRadius: "8px", background: t.card }}
            >
              <div>
                <div style={{ fontSize: "14px", fontWeight: "500", color: t.text }}>{medicine.medicineName}</div>
                <div style={{ fontSize: "12px", color: t.muted, marginTop: "2px" }}>{medicine.member || "Self"} · {medicine.expiryDate}</div>
              </div>
              <div style={{
                fontSize: "11px",
                fontWeight: "500",
                color: status === "Expired" ? "#ef4444" : status === "Expiring soon" ? "#f59e0b" : "#22c55e"
              }}>
                {status}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredMedicines.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: t.muted, fontSize: "14px" }}>
          No medicines to export.
        </div>
      )}

      {/* Download button */}
      <button
        style={{
          width: "100%",
          padding: "14px",
          background: filteredMedicines.length === 0 ? "#9ca3af" : "#4F46E5",
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontSize: "15px",
          fontWeight: "500",
          cursor: filteredMedicines.length === 0 ? "not-allowed" : "pointer",
          opacity: generating ? 0.7 : 1
        }}
        onClick={generatePDF}
        disabled={generating || filteredMedicines.length === 0}
      >
        {generating ? "Generating PDF..." : "Download PDF"}
      </button>

    </div>
  );
}

export default ExportPDF;