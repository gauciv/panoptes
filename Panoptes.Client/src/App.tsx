import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SubscriptionDetail from './pages/SubscriptionDetail';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/subscriptions/:id" element={<SubscriptionDetail />} />
      </Routes>
    </Router>
  );
}

export default App;

