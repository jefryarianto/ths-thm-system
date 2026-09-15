import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile_flutter/presentation/widgets/org_structure_fields.dart';

const _h = {'content-type': 'application/json; charset=utf-8'};

/// MockClient with cascade filter: distrik → wilayah → ranting.
/// Distrik A (d1) has wilayahs; Distrik B (d2) has none.
/// Wilayah 1 (w1) has rantings; Wilayah 2 (w2) has none.
MockClient _mock() {
  return MockClient((req) async {
    final p = req.url.path;
    if (p.endsWith('/distrik')) {
      return http.Response(
        jsonEncode({
          'success': true,
          'data': [
            {'id': 'd1', 'nama': 'Distrik A'},
            {'id': 'd2', 'nama': 'Distrik B'},
          ],
        }),
        200, headers: _h,
      );
    }
    if (p.endsWith('/wilayah')) {
      final d = req.url.queryParameters['distrikId'];
      return http.Response(
        jsonEncode({
          'success': true,
          'data': d == 'd1'
              ? [
                  {'id': 'w1', 'nama': 'Wilayah 1'},
                  {'id': 'w2', 'nama': 'Wilayah 2'},
                ]
              : <Map<String, String>>[],
        }),
        200, headers: _h,
      );
    }
    if (p.endsWith('/ranting')) {
      final w = req.url.queryParameters['wilayahId'];
      return http.Response(
        jsonEncode({
          'success': true,
          'data': w == 'w1'
              ? [
                  {'id': 'r1', 'nama': 'Ranting X'},
                  {'id': 'r2', 'nama': 'Ranting Y'},
                ]
              : <Map<String, String>>[],
        }),
        200, headers: _h,
      );
    }
    return http.Response('{"success":false}', 404, headers: _h);
  });
}

Future<void> _pump(
  WidgetTester tester, {
  http.Client? client,
  ValueChanged<String?>? onChanged,
}) async {
  await tester.pumpWidget(MaterialApp(
    home: Scaffold(body: Form(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: OrgStructureFields(
          client: client ?? _mock(),
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
      client: MockClient((req) async {
        log.add(req.url);
        final p = req.url.path;
        if (p.endsWith('/distrik')) {
          return http.Response(
            jsonEncode({'success': true, 'data': [
              {'id': 'd1', 'nama': 'Distrik A'},
              {'id': 'd2', 'nama': 'Distrik B'},
            ]}), 200, headers: _h);
        }
        if (p.endsWith('/wilayah')) {
          final d = req.url.queryParameters['distrikId'];
          return http.Response(
            jsonEncode({'success': true, 'data': d == 'd1'
              ? [{'id': 'w1', 'nama': 'Wilayah 1'}]
              : []}), 200, headers: _h);
        }
        if (p.endsWith('/ranting')) {
          final w = req.url.queryParameters['wilayahId'];
          return http.Response(
            jsonEncode({'success': true, 'data': w == 'w1'
              ? [{'id': 'r1', 'nama': 'Ranting X'}]
              : []}), 200, headers: _h);
        }
        return http.Response('fail', 404, headers: _h);
      }),
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
    final client = MockClient((req) async {
      if (req.url.path.endsWith('/distrik')) {
        if (failed) { failed = false; return http.Response('err', 500); }
        return http.Response(
          jsonEncode({'success': true, 'data': [
            {'id': 'd1', 'nama': 'Distrik A'},
          ]}), 200, headers: _h);
      }
      return http.Response('fail', 404, headers: _h);
    });

    await _pump(tester, client: client);
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
          OrgStructureFields(client: _mock(), onRantingChanged: (_) {}),
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
