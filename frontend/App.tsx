import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Invoices from './pages/Invoices';
import Customers from './pages/Customers';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Settings from './pages/SettingsNew';
import Notifications from './pages/Notifications';
import Messages from './pages/Messages';
import Plans from './pages/Plans';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import Register from './pages/Register';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { SyncProvider } from './context/SyncContext';
import { Loader2 } from 'lucide-react';

// Loading Screen Component
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center">
    <div className="text-center text-white">
      <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
      <p className="text-lg">جاري التحميل...</p>
    </div>
  </div>
);

// Protected Route Component (Must be logged in)
const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Public Only Route Component (Must NOT be logged in, e.g., Login Page)
const PublicOnlyRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <NotificationProvider>
          <SyncProvider>
            <HashRouter>
              <Routes>
                <Route path="/login" element={
                  <PublicOnlyRoute>
                    <Login />
                  </PublicOnlyRoute>
                } />
                <Route path="/register" element={
                  <PublicOnlyRoute>
                    <Register />
                  </PublicOnlyRoute>
                } />
                
                <Route path="/" element={
                  <RequireAuth>
                    <Layout />
                  </RequireAuth>
                }>
                  <Route index element={<Dashboard />} />
                  <Route path="products" element={<Products />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="invoices" element={<Invoices />} />
                  <Route path="expenses" element={<Expenses />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="messages" element={<Messages />} />
                  <Route path="plans" element={<Plans />} />
                  <Route path="pricing" element={<Pricing />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Routes>
            </HashRouter>
          </SyncProvider>
        </NotificationProvider>
      </SettingsProvider>
    </AuthProvider>
  );
};

export default App;