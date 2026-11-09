import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/design/tokens.dart';
import 'features/kta/data/models/anggota.dart';
import 'features/kta/data/repositories/kta_repository.dart';
import 'features/kta/data/services/kta_api_service.dart';
import 'features/kta/presentation/screens/kta_list_screen.dart';
import 'features/kta/presentation/screens/kta_preview_screen.dart';

KtaRepository? appRepositoryOverride;

void main({
  KtaRepository? repository,
  Anggota? initialAnggota,
}) {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    MyApp(
      repository: repository ?? appRepositoryOverride,
      initialAnggota: initialAnggota,
    ),
  );
}

class MyApp extends StatelessWidget {
  final KtaRepository? repository;
  final Anggota? initialAnggota;

  const MyApp({
    super.key,
    this.repository,
    this.initialAnggota,
  });

  @override
  Widget build(BuildContext context) {
    final repo = repository ??
        KtaRepository(
          apiService: KtaApiService(
            baseUrl: 'https://ths-thm.org',
          ),
        );

    return Provider<KtaRepository>.value(
      value: repo,
      child: MaterialApp(
        title: 'KTA THS-THM',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: KTAColors.primaryNavy),
          useMaterial3: true,
          fontFamily: KTATypography.fontFamily,
        ),
        home: initialAnggota != null
            ? KtaPreviewScreen(
                anggota: initialAnggota,
                repository: repo,
              )
            : KtaListScreen(
                repository: repo,
              ),
      ),
    );
  }
}

typedef KtaApp = MyApp;
