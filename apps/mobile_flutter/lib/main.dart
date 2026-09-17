import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'core/services/app_update_service.dart';
import 'core/services/fcm_service.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/theme_controller.dart';
import 'firebase_options.dart';
import 'logic/auth/auth_bloc.dart';
import 'logic/document/document_bloc.dart';
import 'logic/dues/dues_bloc.dart';
import 'logic/forum/forum_bloc.dart';
import 'logic/pendadaran/pendadaran_bloc.dart';
import 'logic/gamification/gamification_bloc.dart';
import 'logic/home_feed/home_feed_bloc.dart';
import 'logic/member/member_bloc.dart';
import 'logic/assessments/assessment_bloc.dart';
import 'logic/notification/notification_bloc.dart';
import 'presentation/screens/document_detail_screen.dart';
import 'presentation/screens/assessment_aspect_screen.dart';
import 'presentation/screens/assessment_item_screen.dart';
import 'presentation/screens/assessment_score_screen.dart';
import 'presentation/screens/documents_screen.dart';
import 'presentation/screens/dues_screen.dart';
import 'presentation/screens/force_change_password_screen.dart';
import 'presentation/screens/forgot_password_screen.dart';
import 'presentation/screens/pendadaran_create_screen.dart';
import 'presentation/screens/pendadaran_detail_screen.dart';
import 'presentation/screens/forum_create_screen.dart';
import 'presentation/screens/pendadaran_screen.dart';
import 'presentation/screens/forum_screen.dart';
import 'presentation/screens/forum_thread_detail_screen.dart';
import 'presentation/screens/forum_threads_screen.dart';
import 'presentation/screens/gamification_screen.dart';
import 'presentation/screens/home_screen.dart';
import 'presentation/screens/kta_screen.dart';
import 'presentation/screens/login_screen.dart';
import 'presentation/screens/main_shell.dart';
import 'presentation/screens/notifications_screen.dart';
import 'presentation/screens/profile_edit_screen.dart';
import 'presentation/screens/profile_screen.dart';
import 'presentation/screens/qr_scan_screen.dart';
import 'presentation/screens/registration_form_screen.dart';
import 'presentation/screens/claim_account_form_screen.dart';
import 'presentation/screens/registrations_admin_screen.dart';
import 'presentation/screens/claims_admin_screen.dart';
import 'presentation/screens/settings_screen.dart';
import 'presentation/screens/splash_screen.dart';
import 'presentation/screens/berita_detail_screen.dart';
import 'presentation/screens/kegiatan_detail_screen.dart';
import 'presentation/screens/kta_viewer_screen.dart';
import 'presentation/screens/verification_result_screen.dart';
import 'logic/registration/registration_bloc.dart';
import 'logic/claim/claim_bloc.dart';

/// Sinyal untuk melaporkan perubahan status autentikasi ke router agar
/// redirect di-evaluasi ulang (go_router `refreshListenable`).
final ValueNotifier<int> _routerRefresh = ValueNotifier<int>(0);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  // Inisialisasi FCM (token + listener push) dan pengecekan pembaruan aplikasi
  // berjalan paralel tanpa menunda render UI.
  unawaited(FcmService.instance.initialize());
  unawaited(AppUpdateService.instance.checkNow());

  final themeController = await ThemeController.load();
  runApp(MyApp(themeController: themeController));
}

class MyApp extends StatelessWidget {
  final ThemeController themeController;
  const MyApp({super.key, required this.themeController});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (_) => AuthBloc()..add(const AuthLoadUserRequested()),
        ),
        BlocProvider(create: (_) => MemberBloc()),
        BlocProvider(create: (_) => DuesBloc()),
        BlocProvider(create: (_) => DocumentBloc()),
        BlocProvider(create: (_) => NotificationBloc()),
        BlocProvider(create: (_) => PendadaranBloc()),
        BlocProvider(create: (_) => AssessmentBloc()),
        BlocProvider(create: (_) => GamificationBloc()),
        BlocProvider(create: (_) => HomeFeedBloc()),
        BlocProvider(create: (_) => ForumBloc()),
        BlocProvider(create: (_) => RegistrationBloc()),
        BlocProvider(create: (_) => ClaimBloc()),
      ],
      child: ChangeNotifierProvider.value(
        value: themeController,
        child: BlocListener<AuthBloc, AuthState>(
          listenWhen: (previous, current) =>
              previous.runtimeType != current.runtimeType,
          listener: (context, state) {
            _routerRefresh.value++;
          },
          child: ListenableBuilder(
            listenable: themeController,
            builder: (context, _) {
              return MaterialApp.router(
                title: 'THS-THM',
                debugShowCheckedModeBanner: false,
                theme: AppTheme.light(),
                darkTheme: AppTheme.dark(),
                themeMode: themeController.mode,
                routerConfig: AppRouter.router,
              );
            },
          ),
        ),
      ),
    );
  }
}

class AppRouter {
  static GoRouter router = GoRouter(
    initialLocation: '/',
    refreshListenable: _routerRefresh,
    redirect: (context, state) {
      final authState = context.read<AuthBloc>().state;
      final location = state.matchedLocation;

      // Saat memuat sesi dari penyimpanan — tampilkan splash.
      //
      // Catatan: `AuthLoading` sengaja TIDAK dimasukkan ke kondisi ini.
      // State itu hanya di-emit oleh flow login; memaksa navigasi ke '/'
      // saat login membuat LoginScreen (beserta listener yang menangani
      // sukses/error/must-change-password) ter-dispose, sehingga ketika
      // login gagal (`AuthError`) pengguna terjebak di splash selamanya.
      if (authState is AuthInitial) {
        return location == '/' ? null : '/';
      }

      if (authState is AuthUnauthenticated) {
        if (_isPublicPath(location)) return null;
        return '/login';
      }

      if (authState is AuthMustChangePassword) {
        if (location != '/force-change-password') {
          return '/force-change-password';
        }
        return null;
      }

      if (authState is AuthAuthenticated) {
        // Sudah login — arahkan ke home jika masih di splash '/' atau
        // halaman publik agar tidak terjebak di splash screen.
        if (_isPublicPath(location) ||
            location == '/login' ||
            location == '/') {
          return '/home';
        }
        return null;
      }

      return null;
    },
    routes: [
      GoRoute(
          path: '/', builder: (context, state) => const VideoSplashScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/forgot-password',
        builder: (context, state) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/force-change-password',
        builder: (context, state) => const ForceChangePasswordScreen(),
      ),
      GoRoute(
          path: '/settings',
          builder: (context, state) => const SettingsScreen()),
      GoRoute(
        path: '/profile/edit',
        builder: (context, state) => const ProfileEditScreen(),
      ),
      GoRoute(path: '/kta', builder: (context, state) => const KtaScreen()),
      GoRoute(
        path: '/kta/viewer',
        builder: (context, state) => const KtaViewerScreen(),
      ),
      GoRoute(
        path: '/kta/verify/:token',
        builder: (context, state) => VerificationResultScreen(
          token: state.pathParameters['token']!,
        ),
      ),
      GoRoute(
        path: '/notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '/documents',
        builder: (context, state) => const DocumentsScreen(),
      ),
      GoRoute(
        path: '/documents/:id',
        builder: (context, state) =>
            DocumentDetailScreen(id: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/forum',
        builder: (context, state) => const ForumScreen(),
      ),
      GoRoute(
        path: '/forum/c/:categoryId',
        builder: (context, state) => ForumThreadsScreen(
          categoryId: state.pathParameters['categoryId']!,
          categoryName: state.uri.queryParameters['name'] ?? '',
        ),
      ),
      GoRoute(
        path: '/forum/t/:id',
        builder: (context, state) => ForumThreadDetailScreen(
          threadId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/forum/create',
        builder: (context, state) => const ForumCreateScreen(),
      ),
      GoRoute(
        path: '/pendadaran',
        builder: (context, state) => const PendadaranScreen(),
      ),
      GoRoute(
        path: '/pendadaran/create',
        builder: (context, state) => const PendadaranCreateScreen(),
      ),
      GoRoute(
        path: '/pendadaran/:id',
        builder: (context, state) =>
            PendadaranDetailScreen(graduationId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/pendadaran/:id/kriteria',
        builder: (context, state) =>
            AssessmentAspectScreen(kegiatanId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/pendadaran/:id/kriteria/:aspekId',
        builder: (context, state) => AssessmentItemScreen(
            kegiatanId: state.pathParameters['id']!,
            aspekId: state.pathParameters['aspekId']!,
            namaAspek: state.uri.queryParameters['nama'] ?? ''),
      ),
      GoRoute(
        path: '/pendadaran/:id/penilaian',
        builder: (context, state) =>
            AssessmentScoreScreen(kegiatanId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/gamification',
        builder: (context, state) => const GamificationScreen(),
      ),
      GoRoute(
        path: '/berita/:slug',
        builder: (context, state) =>
            BeritaDetailScreen(slug: state.pathParameters['slug']!),
      ),
      GoRoute(
        path: '/kegiatan/:id',
        builder: (context, state) =>
            KegiatanDetailScreen(id: state.pathParameters['id']!),
      ),
      // ── Publik: Registrasi & Klaim ──
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegistrationFormScreen(),
      ),
      GoRoute(
        path: '/claim-account',
        builder: (context, state) => const ClaimAccountFormScreen(),
      ),
      // ── Admin: Verifikasi Pendaftaran & Klaim ──
      GoRoute(
        path: '/admin/registrations',
        builder: (context, state) => const RegistrationsAdminScreen(),
      ),
      GoRoute(
        path: '/admin/claims',
        builder: (context, state) => const ClaimsAdminScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            MainShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                  path: '/home',
                  builder: (context, state) => const HomeScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                  path: '/dues',
                  builder: (context, state) => const DuesScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                  path: '/qr-scan',
                  builder: (context, state) => const QrScanScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                  path: '/forum-tab',
                  builder: (context, state) => const ForumScreen()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                  path: '/profile',
                  builder: (context, state) => const ProfileScreen()),
            ],
          ),
        ],
      ),
    ],
  );

  static bool _isPublicPath(String location) {
    return location == '/' ||
        location == '/login' ||
        location == '/forgot-password' ||
        location == '/register' ||
        location == '/claim-account';
  }
}
