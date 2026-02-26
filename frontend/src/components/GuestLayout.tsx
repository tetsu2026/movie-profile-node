import { Link, Outlet } from 'react-router-dom';

export default function GuestLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-100 pt-6 sm:justify-center sm:pt-0">
      <div className="mb-6">
        <Link to="/" className="text-2xl font-bold text-gray-800">
          動画プロフィール
        </Link>
      </div>

      <div className="mt-6 w-full overflow-hidden bg-white px-6 py-4 shadow-md sm:max-w-md sm:rounded-lg">
        <Outlet />
      </div>
    </div>
  );
}
