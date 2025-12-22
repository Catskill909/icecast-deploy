import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import { ToastProvider } from './components/ui/Toast';
import Dashboard from './pages/Dashboard';
import Stations from './pages/Stations';
import Alerts from './pages/Alerts';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import CreateStation from './pages/CreateStation';
import Help from './pages/Help';

function App() {
  return (
    <ToastProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create" element={<CreateStation />} />
            <Route path="/servers" element={<Stations />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
          </Routes>
        </Layout>
      </Router>
    </ToastProvider>
  );
}

export default App
