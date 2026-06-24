import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./ThemeContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AddMedicine from "./pages/AddMedicine";
import MedicineDetail from "./pages/MedicineDetail";
import Alarms from "./pages/Alarms";
import Refill from "./pages/Refill";
import Scanner from "./pages/Scanner";
import History from "./pages/History";
import Prescription from "./pages/Prescription";
import ExportPDF from "./pages/ExportPDF";
import Pharmacy from "./pages/Pharmacy";
import Interactions from "./pages/Interactions";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/add-medicine" element={<AddMedicine />} />
          <Route path="/medicine/:id" element={<MedicineDetail />} />
          <Route path="/alarms" element={<Alarms />} />
          <Route path="/refill" element={<Refill />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/history" element={<History />} />
          <Route path="/prescription/:id" element={<Prescription />} />
          <Route path="/export" element={<ExportPDF />} />
          <Route path="/pharmacy" element={<Pharmacy />} />
          <Route path="/interactions" element={<Interactions />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;