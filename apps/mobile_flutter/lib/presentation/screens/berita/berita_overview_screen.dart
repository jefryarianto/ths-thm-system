import 'package:flutter/material.dart';
import '../../widgets/app_bar_icon_title.dart';
import 'berita_submit_screen.dart';
import 'berita_status_screen.dart';

class BeritaOverviewScreen extends StatefulWidget {
  const BeritaOverviewScreen({super.key});

  @override
  State<BeritaOverviewScreen> createState() => _BeritaOverviewScreenState();
}

class _BeritaOverviewScreenState extends State<BeritaOverviewScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    BeritaSubmitScreen(),
    BeritaStatusScreen(),
  ];

  final List<String> _titles = ['Ajukan Berita', 'Status Pengajuan'];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: AppBarIconTitle(
          icon: Icons.newspaper_outlined,
          title: _titles[_currentIndex],
        ),
      ),
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(
              icon: Icon(Icons.add_box_outlined), label: 'Ajukan'),
          BottomNavigationBarItem(
              icon: Icon(Icons.list_alt_outlined), label: 'Status'),
        ],
      ),
    );
  }
}
