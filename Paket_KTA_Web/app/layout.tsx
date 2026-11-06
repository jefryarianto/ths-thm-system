import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'KTA THS–THM | Contoh integrasi', description: 'Contoh generator KTA dua sisi.' };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="id"><body>{children}</body></html>; }
