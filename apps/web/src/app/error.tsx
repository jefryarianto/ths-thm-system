'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-600">500</h1>
        <h2 className="mt-4 text-xl font-semibold text-gray-800 dark:text-gray-200">
          Terjadi Kesalahan
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Maaf, terjadi kesalahan pada server. Silakan coba lagi.
        </p>
        <button
          onClick={() => reset()}
          className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
