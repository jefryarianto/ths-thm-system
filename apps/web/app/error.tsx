'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log error for debugging
  console.error(error);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
      <div className="text-center px-6">
        <h1 className="text-8xl font-bold text-gray-300 dark:text-gray-700">500</h1>
        <h2 className="mt-4 text-2xl font-semibold text-gray-800 dark:text-gray-200">
          Terjadi Kesalahan
        </h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Maaf, terjadi kesalahan pada server. Silakan coba lagi.
        </p>
        <button
          onClick={() => reset()}
          className="mt-8 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
