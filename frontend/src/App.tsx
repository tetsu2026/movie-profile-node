import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGuard, GuestGuard, AdminGuard } from './guards/AuthGuard';
import AppLayout from './components/AppLayout';
import GuestLayout from './components/GuestLayout';

// 公開ページ
import Home from './pages/public/Home';
import PublicProfile from './pages/public/PublicProfile';

// 認証ページ
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// ダッシュボード
import Dashboard from './pages/dashboard/Dashboard';
import ProfileEdit from './pages/dashboard/ProfileEdit';
import VideoList from './pages/dashboard/VideoList';
import VideoUpload from './pages/dashboard/VideoUpload';
import ProfilePreview from './pages/dashboard/ProfilePreview';
import ProfileSettings from './pages/dashboard/ProfileSettings';

// 管理者
import UserList from './pages/admin/UserList';
import UserEdit from './pages/admin/UserEdit';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 公開ページ */}
          <Route path="/" element={<Home />} />
          <Route path="/users/:id" element={<PublicProfile />} />

          {/* ゲスト限定ページ */}
          <Route element={<GuestGuard />}>
            <Route element={<GuestLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
            </Route>
          </Route>

          {/* 認証必須ページ */}
          <Route element={<AuthGuard />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/profile/edit" element={<ProfileEdit />} />
              <Route path="/dashboard/videos" element={<VideoList />} />
              <Route path="/dashboard/videos/upload" element={<VideoUpload />} />
              <Route path="/dashboard/profile/preview" element={<ProfilePreview />} />
              <Route path="/profile" element={<ProfileSettings />} />
            </Route>
          </Route>

          {/* 管理者ページ */}
          <Route element={<AdminGuard />}>
            <Route element={<AppLayout />}>
              <Route path="/admin/users" element={<UserList />} />
              <Route path="/admin/users/:id/edit" element={<UserEdit />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
