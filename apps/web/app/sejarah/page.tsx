import Link from 'next/link';

export default function SejarahPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-black text-blue-900 mb-8 text-center">Sejarah THS-THM</h1>
        <div className="prose prose-blue max-w-none text-gray-700">
          <p>
            Tunggal Hati Seminari - Tunggal Hati Maria (THS-THM) adalah organisasi bela diri pencak silat
            berbasis Katolik. THS-THM didirikan sebagai sarana pengembangan diri, iman, dan persaudaraan.
          </p>
          <h2 className="text-2xl font-bold text-blue-900 mt-8 mb-4">Filosofi</h2>
          <p>
            THS-THM berlandaskan pada semangat kasih, kerendahan hati, dan pengabdian kepada sesama,
            mengikuti teladan Yesus Kristus dan Bunda Maria.
          </p>
        </div>
      </section>
    </div>
  );
}
