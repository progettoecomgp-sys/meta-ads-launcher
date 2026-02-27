import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Creatives from './pages/Creatives';
import History from './pages/History';
import Metrics from './pages/Metrics';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppProvider>
                <div className="flex min-h-screen">
                  <Sidebar />
                  <main className="flex-1 ml-[220px] min-h-screen">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/upload" element={<Upload />} />
                      <Route path="/creatives" element={<Creatives />} />
                      <Route path="/history" element={<History />} />
                      <Route path="/metrics" element={<Metrics />} />
                      <Route path="/settings" element={<Settings />} />
                    </Routes>
                  </main>
                  <Toast />
                </div>
              </AppProvider>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
