import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/presentation/widgets/org_structure_fields.dart';

/// Wrapper respons tiruan — meniru `Response.data` milik dio.
class _Res {
  final dynamic data;
  const _Res(this.data);
}

/// Seam fetch tiruan dengan filter cascade: distrik → wilayah → ranting.
/// Distrik A (d1) punya wilayah; Distrik B (d2) tidak.
/// Wilayah 1 (w1) punya ranting; Wilayah 2 (w2) tidak.
Future<dynamic> Function(String url) _mockFetch() {
  return (url) async {
    final u = Uri.parse(url);
    final p = u.path;
    if (p.endsWith('/distrik')) {
      return const _Res({
        'success': true,
        'data': [
          {'id': 'd1', 'nama': 'Distrik A'},
          {'id': 'd2', 'nama': 'Distrik B'},
        ],
      });
    }
    if (p.endsWith('/wilayah')) {
      final d = u.queryParameters['distrikId'];
      return _Res({
        'success': true,
        'data': d == 'd1'
            ? [
                {'id': 'w1', 'nama': 'Wilayah 1'},
                {'id': 'w2', 'nama': 'Wilayah 2'},
              ]
            : <Map<String, String>>[],
      });
    }
    if (p.endsWith('/ranting')) {
      final w = u.queryParameters['wilayahId'];
      return _Res({
        'success': true,
        'data': w == 'w1'
            ? [
                {'id': 'r1', 'nama': 'Ranting X'},
                {'id': 'r2', 'nama': 'Ranting Y'},
              ]
            : <Map<String, String>>[],
      });
    }
    return const _Res({'success': false});
  };
}

Future<void> _pump(
  WidgetTester tester, {
  Future<dynamic> Function(String url)? fetch,
  ValueChanged<String?>? onChanged,
}) async {
  await tester.pumpWidget(MaterialApp(
    home: Scaffold(body: Form(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: OrgStructureFields(
          fetch: fetch ?? _mockFetch(),
          onRantingChanged: onChanged ?? (_) {},
        ),
      ),
    )),
  ));
}

/// Search TextField in bottom sheet (by hint text).
Finder _sf() => find.byWidgetPredicate(
    (w) => w is TextField && w.decoration?.hintText?.contains('Cari') == true);

void main() {
  testWidgets('Cascade Distrik->Wilayah->Ranting with query filters', (tester) async {
    final log = <Uri>[];
    String? sel;

    await _pump(tester,
      fetch: (url) async {
        log.add(Uri.parse(url));
        final u = Uri.parse(url);
        final p = u.path;
        if (p.endsWith('/distrik')) {
          return const _Res({
            'success': true,
            'data': [
              {'id': 'd1', 'nama': 'Distrik A'},
              {'id': 'd2', 'nama': 'Distrik B'},
            ],
          });
        }
        if (p.endsWith('/wilayah')) {
          final d = u.queryParameters['distrikId'];
          return _Res({
            'success': true,
            'data': d == 'd1'
              ? [{'id': 'w1', 'nama': 'Wilayah 1'}]
              : <Map<String, String>>[],
          });
        }
        if (p.endsWith('/ranting')) {
          final w = u.queryParameters['wilayahId'];
          return _Res({
            'success': true,
            'data': w == 'w1'
              ? [{'id': 'r1', 'nama': 'Ranting X'}]
              : <Map<String, String>>[],
          });
        }
        return const _Res({'success': false});
      },
      onChanged: (v) => sel = v,
    );
    await tester.pumpAndSettle();

    // Open bottom sheet.
    await tester.tap(find.text('Ranting Asal *'));
    await tester.pumpAndSettle();
    expect(find.text('Pilih Distrik'), findsOneWidget);
    expect(find.text('Distrik A'), findsOneWidget);

    // Select Distrik A -> loads wilayahs with filter.
    await tester.tap(find.text('Distrik A'));
    await tester.pumpAndSettle();
    expect(find.text('Pilih Wilayah'), findsOneWidget);
    expect(find.text('Wilayah 1'), findsOneWidget);
    expect(log.any((u) => u.path.endsWith('/wilayah') && u.queryParameters['distrikId'] == 'd1'), isTrue);

    // Select Wilayah 1 -> loads rantings with filter.
    await tester.tap(find.text('Wilayah 1'));
    await tester.pumpAndSettle();
    expect(find.text('Pilih Ranting'), findsOneWidget);
    expect(find.text('Ranting X'), findsOneWidget);
    expect(log.any((u) => u.path.endsWith('/ranting') && u.queryParameters['wilayahId'] == 'w1'), isTrue);

    // Select Ranting X -> sheet closes.
    await tester.tap(find.text('Ranting X'));
    await tester.pumpAndSettle();
    expect(sel, 'r1');
    expect(find.text('Distrik A / Wilayah 1 / Ranting X'), findsOneWidget);
  });

  testWidgets('Search filters items', (tester) async {
    await _pump(tester);
    await tester.pumpAndSettle();

    await tester.tap(find.text('Ranting Asal *'));
    await tester.pumpAndSettle();

    // Filter distrik: only B visible.
    await tester.enterText(_sf(), 'B');
    await tester.pumpAndSettle();
    expect(find.text('Distrik B'), findsOneWidget);
    expect(find.text('Distrik A'), findsNothing);

    // Clear.
    await tester.enterText(_sf(), '');
    await tester.pumpAndSettle();
    expect(find.text('Distrik A'), findsOneWidget);

    // Drill down, filter wilayahs.
    await tester.tap(find.text('Distrik A'));
    await tester.pumpAndSettle();
    await tester.enterText(_sf(), '2');
    await tester.pumpAndSettle();
    expect(find.text('Wilayah 2'), findsOneWidget);
    expect(find.text('Wilayah 1'), findsNothing);
  });

  testWidgets('Shows retry when request fails', (tester) async {
    var failed = true;
    Future<dynamic> fetch(String url) async {
      if (Uri.parse(url).path.endsWith('/distrik')) {
        if (failed) {
          failed = false;
          // Simulasi error jaringan/server seperti DioException asli.
          throw DioException(requestOptions: RequestOptions(path: url));
        }
        return const _Res({
          'success': true,
          'data': [
            {'id': 'd1', 'nama': 'Distrik A'},
          ],
        });
      }
      return const _Res({'success': false});
    }

    await _pump(tester, fetch: fetch);
    await tester.pumpAndSettle();

    await tester.tap(find.text('Ranting Asal *'));
    await tester.pumpAndSettle();

    expect(find.text('Gagal memuat data'), findsOneWidget);
    expect(find.text('Coba lagi'), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.tap(find.text('Coba lagi'));
    await tester.pumpAndSettle();

    expect(find.text('Gagal memuat data'), findsNothing);
    expect(find.text('Distrik A'), findsOneWidget);
  });

  testWidgets('Form invalid without selection', (tester) async {
    final fk = GlobalKey<FormState>();
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: Form(key: fk, child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          OrgStructureFields(fetch: _mockFetch(), onRantingChanged: (_) {}),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () => fk.currentState!.validate(),
            child: const Text('Simpan'),
          ),
        ]),
      ))),
    ));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Simpan'));
    await tester.pumpAndSettle();
    expect(find.text('Pilih ranting'), findsOneWidget);
  });

  testWidgets('Clear button resets selection', (tester) async {
    String? sel;
    await _pump(tester, onChanged: (v) => sel = v);
    await tester.pumpAndSettle();

    // Select through full flow.
    await tester.tap(find.text('Ranting Asal *'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Distrik A'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Wilayah 1'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Ranting X'));
    await tester.pumpAndSettle();
    expect(sel, 'r1');

    // Clear.
    await tester.tap(find.byIcon(Icons.clear));
    await tester.pumpAndSettle();
    expect(sel, isNull);
    expect(find.text('Tap untuk memilih distrik → wilayah → ranting'), findsOneWidget);
  });

  testWidgets('Back button navigates correctly', (tester) async {
    await _pump(tester);
    await tester.pumpAndSettle();

    // Open sheet -> back on step 0 -> closes.
    await tester.tap(find.text('Ranting Asal *'));
    await tester.pumpAndSettle();
    await tester.tap(find.byIcon(Icons.arrow_back));
    await tester.pumpAndSettle();
    expect(find.text('Pilih Distrik'), findsNothing);

    // Reopen -> select distrik -> back -> returns to distrik list.
    await tester.tap(find.text('Ranting Asal *'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Distrik A'));
    await tester.pumpAndSettle();
    expect(find.text('Pilih Wilayah'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.arrow_back));
    await tester.pumpAndSettle();
    expect(find.text('Pilih Distrik'), findsOneWidget);
  });
}
