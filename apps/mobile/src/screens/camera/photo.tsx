import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import apiClient from '../../lib/api-client';
import { CAMERA } from '../../lib/card-design';

/**
 * Layar pengambilan foto potret dengan OVERLAY / BOUNDING BOX wajah (ala SIM).
 * Panduan: wajah di dalam oval, bahu di bawah oval. Foto langsung di-upload
 * ke `POST /auth/me/photo` (API akan menghapus background otomatis) lalu kembali.
 */
export default function CameraPhotoScreen() {
  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [uploading, setUploading] = useState(false);
  const [captureLock, setCaptureLock] = useState(false);

  const handleCapture = async () => {
    if (captureLock || uploading || !cameraRef.current) return;
    setCaptureLock(true);
    setUploading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo?.uri) throw new Error('Gagal mengambil foto');

      const formData = new FormData();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formData.append('photo', {
        uri: photo.uri,
        name: 'kta-photo.jpg',
        type: 'image/jpeg',
      } as any);

      await apiClient.post('/auth/me/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      router.back();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Gagal mengupload foto. Coba lagi.');
      setUploading(false);
      setCaptureLock(false);
    }
  };

  // ── Izin kamera ──
  if (!permission) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <Ionicons name="camera-outline" size={64} color="#cbd5e1" />
        <Text style={styles.permissionText}>Izin kamera diperlukan untuk mengambil foto KTA</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Berikan Izin Kamera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelLink} onPress={() => router.back()}>
          <Text style={styles.cancelLinkText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="front"
        flash={flash}
      />

      {/* Overlay panduan wajah (bounding box ala SIM) */}
      <View style={styles.overlay} pointerEvents="none">
        {/* Header hint */}
        <View style={styles.hintBox}>
          <Ionicons name="scan" size={18} color="#fff" />
          <Text style={styles.hintText}>Posisikan wajah di dalam oval, bahu di bawah garis</Text>
        </View>

        {/* Dim area di luar bingkai */}
        <View style={styles.dimTop} />
        <View style={styles.dimRow}>
          <View style={styles.dimSide} />
          <View style={styles.guideBox}>
            {/* Oval wajah */}
            <View style={styles.oval} />
            {/* Corner brackets crop */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.dimSide} />
        </View>
        <View style={styles.dimBottom} />
      </View>

      {/* Flash toggle */}
      <TouchableOpacity
        style={styles.flashBtn}
        onPress={() => setFlash((f) => (f === 'off' ? 'on' : 'off'))}
      >
        <Ionicons name={flash === 'off' ? 'flash-off' : 'flash'} size={22} color="#fff" />
      </TouchableOpacity>

      {/* Close */}
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Ionicons name="close" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Capture */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.captureBtn, (uploading || captureLock) && styles.captureBtnDisabled]}
          onPress={handleCapture}
          disabled={uploading || captureLock}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <View style={styles.captureInner} />
          )}
        </TouchableOpacity>
        {uploading && <Text style={styles.uploadingText}>Mengupload foto...</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center' },

  hintBox: {
    position: 'absolute',
    top: CAMERA.hint.top,
    left: CAMERA.hint.left,
    right: CAMERA.hint.right,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: CAMERA.hint.bg,
    borderRadius: CAMERA.hint.radius,
    paddingVertical: CAMERA.hint.padV,
    paddingHorizontal: CAMERA.hint.padH,
  },
  hintText: { color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  dimTop: { flex: CAMERA.overlay.dimTop, backgroundColor: CAMERA.overlay.dimColor },
  dimRow: { flexDirection: 'row' },
  dimSide: { flex: CAMERA.overlay.dimSide, backgroundColor: CAMERA.overlay.dimColor },
  dimBottom: { flex: CAMERA.overlay.dimBottom, backgroundColor: CAMERA.overlay.dimColor },

  guideBox: { width: CAMERA.overlay.guide.w, height: CAMERA.overlay.guide.h, alignItems: 'center', justifyContent: 'center' },
  oval: {
    width: CAMERA.overlay.oval.w,
    height: CAMERA.overlay.oval.h,
    borderRadius: CAMERA.overlay.oval.radius,
    borderWidth: CAMERA.overlay.oval.borderWidth,
    borderColor: CAMERA.overlay.oval.borderColor,
    backgroundColor: 'transparent',
    shadowColor: CAMERA.overlay.oval.glow,
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 4,
  },
  corner: {
    position: 'absolute',
    width: CAMERA.overlay.corner.size,
    height: CAMERA.overlay.corner.size,
    borderColor: CAMERA.overlay.corner.color,
  },
  cornerTL: { top: -CAMERA.overlay.corner.offset, left: -CAMERA.overlay.corner.offset, borderTopWidth: CAMERA.overlay.corner.width, borderLeftWidth: CAMERA.overlay.corner.width, borderTopLeftRadius: CAMERA.overlay.corner.radius },
  cornerTR: { top: -CAMERA.overlay.corner.offset, right: -CAMERA.overlay.corner.offset, borderTopWidth: CAMERA.overlay.corner.width, borderRightWidth: CAMERA.overlay.corner.width, borderTopRightRadius: CAMERA.overlay.corner.radius },
  cornerBL: { bottom: -CAMERA.overlay.corner.offset, left: -CAMERA.overlay.corner.offset, borderBottomWidth: CAMERA.overlay.corner.width, borderLeftWidth: CAMERA.overlay.corner.width, borderBottomLeftRadius: CAMERA.overlay.corner.radius },
  cornerBR: { bottom: -CAMERA.overlay.corner.offset, right: -CAMERA.overlay.corner.offset, borderBottomWidth: CAMERA.overlay.corner.width, borderRightWidth: CAMERA.overlay.corner.width, borderBottomRightRadius: CAMERA.overlay.corner.radius },

  flashBtn: {
    position: 'absolute',
    top: CAMERA.flash.top,
    right: CAMERA.flash.right,
    width: CAMERA.flash.size,
    height: CAMERA.flash.size,
    borderRadius: CAMERA.flash.radius,
    backgroundColor: CAMERA.flash.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: CAMERA.close.top,
    left: CAMERA.close.left,
    width: CAMERA.close.size,
    height: CAMERA.close.size,
    borderRadius: CAMERA.close.radius,
    backgroundColor: CAMERA.close.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomBar: {
    position: 'absolute',
    bottom: CAMERA.bottomBar.bottom,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureBtn: {
    width: CAMERA.capture.size,
    height: CAMERA.capture.size,
    borderRadius: CAMERA.capture.radius,
    borderWidth: CAMERA.capture.borderWidth,
    borderColor: CAMERA.capture.borderColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnDisabled: { opacity: 0.6 },
  captureInner: {
    width: CAMERA.capture.inner,
    height: CAMERA.capture.inner,
    borderRadius: CAMERA.capture.innerRadius,
    backgroundColor: CAMERA.capture.innerColor,
  },
  uploadingText: { color: CAMERA.uploading.color, marginTop: CAMERA.uploading.marginTop, fontSize: CAMERA.uploading.fontSize, fontWeight: '600' },

  permissionText: { color: '#cbd5e1', fontSize: 14, marginTop: 16, textAlign: 'center', paddingHorizontal: 32 },
  permissionBtn: {
    marginTop: 20,
    backgroundColor: '#2563eb',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelLink: { marginTop: 16, padding: 8 },
  cancelLinkText: { color: '#93c5fd', fontSize: 14 },
});
