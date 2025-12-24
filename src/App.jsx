import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import { ToastProvider } from './components/ui/Toast';
import Dashboard from './pages/Dashboard';
import Stations from './pages/Stations';
import Alerts from './pages/Alerts';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import CreateStation from './pages/CreateStation';
import Help from './pages/Help';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

// Layout wrapper that includes ProtectedRoute
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Layout>
        <Outlet />
      </Layout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          {/* Login page - standalone, no layout */}
          <Route path="/login" element={<Login />} />

          {/* All protected routes wrapped in Layout */}
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create" element={<CreateStation />} />
            <Route path="/servers" element={<Stations />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
          </Route>
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App
