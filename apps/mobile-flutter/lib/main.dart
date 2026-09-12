import 'package:flutter/material.dart';

import 'core/api_client.dart';
import 'core/app_theme.dart';
import 'core/auth_controller.dart';
import 'core/token_storage.dart';
import 'features/auth/login_page.dart';
import 'features/card/digital_card_page.dart';
import 'features/documents/documents_page.dart';
import 'features/dues/dues_page.dart';
import 'features/home/home_page.dart';
import 'features/notifications/notifications_page.dart';
import 'features/profile/profile_page.dart';

void main() {
  final tokens = TokenStorage();
  final api = ApiClient(tokens);
  runApp(ThsThmApp(auth: AuthController(tokens: tokens, api: api), api: api));
}

class ThsThmApp extends StatefulWidget {
  const ThsThmApp({required this.auth, required this.api, super.key});
  final AuthController auth;
  final ApiClient api;

  @override
  State<ThsThmApp> createState() => _ThsThmAppState();
}

class _ThsThmAppState extends State<ThsThmApp> {
  @override
  void initState() {
    super.initState();
    widget.auth.addListener(_authChanged);
    widget.auth.restoreSession();
  }

  @override
  void dispose() { widget.auth.removeListener(_authChanged); super.dispose(); }
  void _authChanged() => setState(() {});

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'THS-THM Flutter', debugShowCheckedModeBanner: false, theme: buildAppTheme(),
    home: widget.auth.isLoading ? const Scaffold(body: Center(child: CircularProgressIndicator())) : widget.auth.isAuthenticated ? AppShell(auth: widget.auth, api: widget.api) : LoginPage(auth: widget.auth),
    routes: {'/documents': (_) => DocumentsPage(api: widget.api), '/dues': (_) => DuesPage(api: widget.api), '/notifications': (_) => NotificationsPage(api: widget.api)},
  );
}

class AppShell extends StatefulWidget { const AppShell({required this.auth, required this.api, super.key}); final AuthController auth; final ApiClient api; @override State<AppShell> createState() => _AppShellState(); }
class _AppShellState extends State<AppShell> {
  int _index = 0;
  @override Widget build(BuildContext context) {
    final pages = [HomePage(auth: widget.auth, api: widget.api, onNavigate: (index) => setState(() => _index = index)), DigitalCardPage(auth: widget.auth), ProfilePage(auth: widget.auth)];
    return Scaffold(body: SafeArea(child: pages[_index]), bottomNavigationBar: NavigationBar(selectedIndex: _index, onDestinationSelected: (index) => setState(() => _index = index), destinations: const [NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Beranda'), NavigationDestination(icon: Icon(Icons.credit_card_outlined), selectedIcon: Icon(Icons.credit_card), label: 'Kartu'), NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profil')]));
  }
}
