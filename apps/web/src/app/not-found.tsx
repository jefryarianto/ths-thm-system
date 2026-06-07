import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-600">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
          Halaman Tidak Ditemukan
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Halaman yang Anda cari tidak ada atau telah dipindahkan.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Kembali ke Login
        </Link>
      </div>
    </div>
  );
}
