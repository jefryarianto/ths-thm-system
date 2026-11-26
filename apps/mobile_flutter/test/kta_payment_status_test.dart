import 'package:bloc_test/bloc_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/data/models/kta_application.dart';
import 'package:mobile_flutter/logic/kta_application/kta_application_bloc.dart';
import 'package:mobile_flutter/presentation/screens/kta_status_screen.dart';
import 'package:mocktail/mocktail.dart';

import 'helpers/kta_apply_fixtures.dart';

class MockKtaApplicationBloc
    extends MockBloc<KtaApplicationEvent, KtaApplicationState>
    implements KtaApplicationBloc {}

void main() {
  Future<void> pumpStatus(
    WidgetTester tester, {
    required KtaAppStatus status,
  }) async {
    final bloc = MockKtaApplicationBloc();
    final state = KtaApplicationLoaded(application: ktaApplication(status: status));
    when(() => bloc.state).thenReturn(state);
    whenListen(bloc, Stream<KtaApplicationState>.value(state));

    await tester.pumpWidget(
      MaterialApp(
        home: BlocProvider<KtaApplicationBloc>.value(
          value: bloc,
          child: const KtaStatusScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.drag(find.byType(ListView).first, const Offset(0, -800));
    await tester.pumpAndSettle();
  }

  testWidgets('PAYMENT_SETUP menampilkan rekening dan tombol upload', (tester) async {
    await pumpStatus(tester, status: KtaAppStatus.paymentSetup);

    expect(find.text('Rp 250.000'), findsOneWidget);
    expect(find.text('BCA 1234567890 a.n. THS THM'), findsOneWidget);
    expect(find.text('Transfer sebelum batas waktu'), findsOneWidget);
    expect(find.text('Unggah bukti pelunasan'), findsOneWidget);
  });

  testWidgets('PAYMENT_PENDING menampilkan status dan tombol unggah ulang', (tester) async {
    await pumpStatus(tester, status: KtaAppStatus.paymentPending);

    expect(find.text('Menunggu verifikasi pembayaran'), findsOneWidget);
    expect(find.text('Unggah ulang bukti'), findsOneWidget);
  });
}
