import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOUR_STORAGE_KEY = 'gamification_tour_seen_v2';

interface TourStep {
  icon: string;
  title: string;
  description: string;
  color: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    icon: '🏆',
    title: 'Level & Poin',
    description:
      'Setiap aktivitas seperti latihan dan pembayaran iuran memberikan poin. Kumpulkan poin untuk naik level dari Bronze → Silver → Gold → Platinum → Diamond!',
    color: '#f59e0b',
  },
  {
    icon: '🎖️',
    title: 'Badge & Pencapaian',
    description:
      'Dapatkan badge khusus dengan mencapai target tertentu, seperti mengikuti 5 latihan (Pemula Latihan) atau membayar iuran 12 bulan berturut-turut (Setia).',
    color: '#8b5cf6',
  },
  {
    icon: '🔥',
    title: 'Streak',
    description:
      'Pertahankan konsistensi! Streak latihan dan iuran Anda akan terus bertambah setiap kali melakukan aktivitas secara berturut-turut. Jangan sampai putus!',
    color: '#ef4444',
  },
  {
    icon: '🎁',
    title: 'Reward & Redeem',
    description:
      'Tukarkan poin Anda dengan reward menarik! Pilih reward yang tersedia, konfirmasi redeem, dan tunggu persetujuan admin untuk mendapatkan hadiah.',
    color: '#22c55e',
  },
  {
    icon: '📊',
    title: 'Leaderboard',
    description:
      'Lihat peringkat Anda dibandingkan anggota lain! Filter berdasarkan distrik, wilayah, atau ranting untuk melihat siapa yang paling aktif.',
    color: '#3b82f6',
  },
];

const { width } = Dimensions.get('window');

export default function GamificationTour() {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    checkTourSeen();
  }, []);

  const checkTourSeen = async () => {
    try {
      const seen = await AsyncStorage.getItem(TOUR_STORAGE_KEY);
      if (!seen) {
        // Show tour after a slight delay for smooth UX
        setTimeout(() => setVisible(true), 500);
      }
    } catch {
      // Ignore
    }
  };

  const markSeen = async () => {
    try {
      await AsyncStorage.setItem(TOUR_STORAGE_KEY, 'true');
    } catch {
      // Ignore
    }
  };

  const animateStep = (step: number) => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -step * (width - 64),
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
      animateStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      animateStep(currentStep - 1);
    }
  };

  const handleDone = () => {
    markSeen();
    setVisible(false);
  };

  const handleSkip = () => {
    markSeen();
    setVisible(false);
  };

  if (!visible) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={handleSkip}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleSkip}>
            <Ionicons name="close" size={20} color="#9ca3af" />
          </TouchableOpacity>

          {/* Step indicator */}
          <View style={styles.dots}>
            {TOUR_STEPS.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  { backgroundColor: idx === currentStep ? step.color : '#e5e7eb' },
                ]}
              />
            ))}
          </View>

          {/* Content */}
          <View style={styles.contentWrapper}>
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                },
              ]}
            >
              {/* Icon */}
              <View style={[styles.iconCircle, { backgroundColor: step.color + '20' }]}>
                <Text style={styles.icon}>{step.icon}</Text>
              </View>

              {/* Title */}
              <Text style={styles.title}>{step.title}</Text>

              {/* Description */}
              <Text style={styles.description}>{step.description}</Text>
            </Animated.View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {currentStep > 0 ? (
              <TouchableOpacity onPress={handlePrev} style={styles.secondaryButton}>
                <Ionicons name="arrow-back" size={16} color="#6b7280" />
                <Text style={styles.secondaryText}>Kembali</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleSkip} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Lewati</Text>
              </TouchableOpacity>
            )}

            {currentStep < TOUR_STEPS.length - 1 ? (
              <TouchableOpacity
                onPress={handleNext}
                style={[styles.primaryButton, { backgroundColor: step.color }]}
              >
                <Text style={styles.primaryText}>Selanjutnya</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleDone}
                style={[styles.primaryButton, { backgroundColor: step.color }]}
              >
                <Text style={styles.primaryText}>Mulai!</Text>
                <Ionicons name="rocket" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modal: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    paddingTop: 20,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  contentWrapper: {
    minHeight: 220,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  primaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
