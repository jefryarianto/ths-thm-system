/**
 * Builder PDF Kartu Anggota (KTA) — Format kartu identitas.
 * Mengikuti desain dari `packages/card-design` (NextJS/Flutter aligned).
 */
import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

const NAVY_800 = '#0f1f3a';
const NAVY_900 = '#1e3a5f';
const GOLD_400 = '#facc15';
const WHITE = '#ffffff';
const GRAY_100 = '#f3f4f6';
const GRAY_500 = '#6b7280';

const styles = StyleSheet.create({
  page: {
    width: 480,  // ~85.6mm at 300 DPI
    height: 302, // ~53.98mm at 300 DPI
    padding: 0,
    backgroundColor: WHITE,
    position: 'relative',
  },
  background: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 480,
    height: 302,
    objectFit: 'fill',
  },
  // Front side
  front: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 480,
    height: 302,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Back side
  back: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 480,
    height: 302,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Photo area
  photoFrame: {
    position: 'absolute',
    left: 24,
    top: 24,
    width: 120,
    height: 156,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: GRAY_100,
    borderWidth: 2,
    borderColor: NAVY_800,
  },
  photo: {
    width: 120,
    height: 156,
    objectFit: 'cover',
  },
  // Info fields
  fieldLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: NAVY_800,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: NAVY_900,
    marginTop: 2,
  },
  // QR code
  qrFrame: {
    position: 'absolute',
    right: 24,
    top: 24,
    width: 80,
    height: 80,
    backgroundColor: WHITE,
    borderRadius: 4,
    padding: 4,
    borderWidth: 1,
    borderColor: NAVY_800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: 72,
    height: 72,
  },
  // Organization info
  orgHeader: {
    position: 'absolute',
    top: 24,
    left: 160,
    right: 120,
    alignItems: 'flex-start',
  },
  orgName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NAVY_800,
  },
  orgSubtitle: {
    fontSize: 10,
    color: GOLD_400,
    fontWeight: 'bold',
    marginTop: 2,
  },
  // Member info rows
  infoSection: {
    position: 'absolute',
    top: 80,
    left: 160,
    right: 120,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  infoLabel: {
    width: 80,
    ...StyleSheet.flatten({ fontSize: 9, color: GRAY_500, fontWeight: 'bold' }),
  },
  infoValue: {
    flex: 1,
    fontSize: 10,
    color: NAVY_900,
    fontWeight: '500',
  },
  // Barcode / membership number
  memberNumber: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  memberNumberText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: NAVY_800,
    letterSpacing: 2,
    fontFamily: 'Courier',
  },
  // Back side elements
  backHeader: {
    position: 'absolute',
    top: 24,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  backTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NAVY_800,
    textAlign: 'center',
  },
  backSubtitle: {
    fontSize: 10,
    color: GOLD_400,
    fontWeight: 'bold',
    marginTop: 2,
  },
  backInfoSection: {
    position: 'absolute',
    top: 80,
    left: 24,
    right: 24,
  },
  backField: {
    marginBottom: 8,
  },
  emergencyContact: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    borderTopWidth: 1,
    borderTopColor: GRAY_100,
    paddingTop: 12,
  },
});

export interface MemberCardProps {
  // Personal info
  name: string;
  memberNumber: string;
  gender: 'L' | 'P';
  birthPlace?: string;
  birthDate?: string; // ISO string
  address?: string;
  phone?: string;
  email?: string;
  // Organization
  organizationName?: string;
  districtName?: string;
  // Dates
  issueDate?: string; // ISO string
  expiryDate?: string; // ISO string
  // Emergency contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  // QR/Verification
  qrDataUrl?: string;
  verificationUrl?: string;
  // Photo
  photoUrl?: string;
  photoBgUrl?: string;
}

export function buildMemberCardPdf(props: MemberCardProps) {
  const {
    name,
    memberNumber,
    gender,
    birthPlace,
    birthDate,
    address,
    phone,
    email,
    organizationName = 'THS-THM',
    districtName = 'Distrik',
    issueDate,
    expiryDate,
    emergencyContactName,
    emergencyContactPhone,
    qrDataUrl,
    photoUrl,
    photoBgUrl,
  } = props;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return React.createElement(
    Document,
    null,
    // FRONT SIDE
    React.createElement(
      Page,
      { size: [480, 302], style: styles.page, key: 'front' },
      // Background image (template)
      photoBgUrl ? React.createElement(Image, { key: 'bg', src: photoBgUrl, style: styles.background }) : null,
      // Photo
      React.createElement(
        View,
        { style: styles.photoFrame },
        photoUrl ? React.createElement(Image, { src: photoUrl, style: styles.photo }) : null,
      ),
      // Organization header
      React.createElement(
        View,
        { style: styles.orgHeader },
        React.createElement(Text, { style: styles.orgName }, organizationName),
        React.createElement(Text, { style: styles.orgSubtitle }, districtName.toUpperCase()),
      ),
      // QR code
      React.createElement(
        View,
        { style: styles.qrFrame },
        qrDataUrl ? React.createElement(Image, { src: qrDataUrl, style: styles.qrImage }) : null,
      ),
      // Member info
      React.createElement(
        View,
        { style: styles.infoSection },
        React.createElement(
          View,
          { style: styles.infoRow },
          React.createElement(Text, { style: styles.infoLabel }, 'NAMA'),
          React.createElement(Text, { style: styles.infoValue }, name.toUpperCase()),
        ),
        React.createElement(
          View,
          { style: styles.infoRow },
          React.createElement(Text, { style: styles.infoLabel }, 'NO. ANGGOTA'),
          React.createElement(Text, { style: { ...styles.infoValue, fontSize: 12, letterSpacing: 1 } }, memberNumber),
        ),
        React.createElement(
          View,
          { style: styles.infoRow },
          React.createElement(Text, { style: styles.infoLabel }, 'JENIS KELAMIN'),
          React.createElement(Text, { style: styles.infoValue }, gender === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'),
        ),
        birthDate && React.createElement(
          View,
          { style: styles.infoRow },
          React.createElement(Text, { style: styles.infoLabel }, 'TTL'),
          React.createElement(Text, { style: styles.infoValue }, `${birthPlace || ''} ${birthPlace && birthDate ? ', ' : ''}${formatDate(birthDate)}`),
        ),
        phone && React.createElement(
          View,
          { style: styles.infoRow },
          React.createElement(Text, { style: styles.infoLabel }, 'TELEPON'),
          React.createElement(Text, { style: styles.infoValue }, phone),
        ),
        email && React.createElement(
          View,
          { style: styles.infoRow },
          React.createElement(Text, { style: styles.infoLabel }, 'EMAIL'),
          React.createElement(Text, { style: styles.infoValue }, email),
        ),
      ),
      // Member number barcode area
      React.createElement(
        View,
        { style: styles.memberNumber },
        React.createElement(Text, { style: styles.memberNumberText }, memberNumber),
        React.createElement(Text, { style: { ...styles.memberNumberText, fontSize: 9, marginTop: 4 } }, `Terbit: ${formatDate(issueDate)} • Berlaku: ${formatDate(expiryDate)}`),
      ),
    ),
    // BACK SIDE
    React.createElement(
      Page,
      { size: [480, 302], style: styles.page, key: 'back' },
      // Background
      photoBgUrl ? React.createElement(Image, { key: 'bg', src: photoBgUrl, style: styles.background }) : null,
      // Header
      React.createElement(
        View,
        { style: styles.backHeader },
        React.createElement(Text, { style: styles.backTitle }, 'KARTU ANGGOTA THS-THM'),
        React.createElement(Text, { style: styles.backSubtitle }, districtName.toUpperCase()),
      ),
      // Info
      React.createElement(
        View,
        { style: styles.backInfoSection },
        React.createElement(
          View,
          { style: styles.backField },
          React.createElement(Text, { style: styles.fieldLabel }, 'NAMA LENGKAP'),
          React.createElement(Text, { style: styles.fieldValue }, name.toUpperCase()),
        ),
        React.createElement(
          View,
          { style: styles.backField },
          React.createElement(Text, { style: styles.fieldLabel }, 'NOMOR ANGGOTA'),
          React.createElement(Text, { style: { ...styles.fieldValue, letterSpacing: 1 } }, memberNumber),
        ),
        React.createElement(
          View,
          { style: styles.backField },
          React.createElement(Text, { style: styles.fieldLabel }, 'JENIS KELAMIN'),
          React.createElement(Text, { style: styles.fieldValue }, gender === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'),
        ),
        birthDate && React.createElement(
          View,
          { style: styles.backField },
          React.createElement(Text, { style: styles.fieldLabel }, 'TANGGAL LAHIR'),
          React.createElement(Text, { style: styles.fieldValue }, `${birthPlace || ''} ${birthPlace && birthDate ? ', ' : ''}${formatDate(birthDate)}`),
        ),
        address && React.createElement(
          View,
          { style: styles.backField },
          React.createElement(Text, { style: styles.fieldLabel }, 'ALAMAT'),
          React.createElement(Text, { style: { ...styles.fieldValue, fontSize: 9 } }, address),
        ),
        phone && React.createElement(
          View,
          { style: styles.backField },
          React.createElement(Text, { style: styles.fieldLabel }, 'TELEPON'),
          React.createElement(Text, { style: styles.fieldValue }, phone),
        ),
        email && React.createElement(
          View,
          { style: styles.backField },
          React.createElement(Text, { style: styles.fieldLabel }, 'EMAIL'),
          React.createElement(Text, { style: styles.fieldValue }, email),
        ),
        issueDate && React.createElement(
          View,
          { style: styles.backField },
          React.createElement(Text, { style: styles.fieldLabel }, 'TANGGAL TERBIT'),
          React.createElement(Text, { style: styles.fieldValue }, formatDate(issueDate)),
        ),
        expiryDate && React.createElement(
          View,
          { style: styles.backField },
          React.createElement(Text, { style: styles.fieldLabel }, 'BERLAKU SAMPAI'),
          React.createElement(Text, { style: styles.fieldValue }, formatDate(expiryDate)),
        ),
      ),
      // Emergency contact
      (emergencyContactName || emergencyContactPhone) && React.createElement(
        View,
        { style: styles.emergencyContact },
        React.createElement(Text, { style: styles.fieldLabel }, 'KONTAK DARURAT'),
        emergencyContactName && React.createElement(Text, { style: { ...styles.fieldValue, fontSize: 10 } }, emergencyContactName),
        emergencyContactPhone && React.createElement(Text, { style: { ...styles.fieldValue, fontSize: 10 } }, emergencyContactPhone),
      ),
      // Verification QR
      qrDataUrl && React.createElement(
        View,
        { style: { ...styles.qrFrame, position: 'absolute', right: 24, bottom: 24 } },
        React.createElement(Image, { src: qrDataUrl, style: styles.qrImage }),
      ),
    ),
  );
}