import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { SyncProvider } from './context/SyncContext';

const Layout = lazy(() => import('./components/Layout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Customers = lazy(() => import('./pages/Customers'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/SettingsNew'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Messages = lazy(() => import('./pages/Messages'));
const Plans = lazy(() => import('./pages/Plans'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AccessDenied = lazy(() => import('./components/AccessDenied'));

// Loading Screen Component
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center">
    <div className="text-center text-white">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
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

// Settings Route Guard (must be authenticated + allowed to manage settings)
const RequireSettingsAccess: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const canManageSettings =
    user?.role === 'sys_admin' ||
    user?.isSuperAdmin === true ||
    user?.permissions?.canManageSettings === true;

  if (!canManageSettings) {
    return (
      <AccessDenied
        title="الوصول للإعدادات مقيّد"
        message="هذا الحساب لا يملك صلاحية إدارة الإعدادات. تواصل مع المسؤول لتفعيل الصلاحية."
      />
    );
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
              <Suspense fallback={<LoadingScreen />}>
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
                    <Route path="settings" element={
                      <RequireSettingsAccess>
                        <Settings />
                      </RequireSettingsAccess>
                    } />
                  </Route>
                </Routes>
              </Suspense>
            </HashRouter>
          </SyncProvider>
        </NotificationProvider>
      </SettingsProvider>
    </AuthProvider>
  );
};

export default App;