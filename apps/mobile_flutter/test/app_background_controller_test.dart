import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/core/theme/app_background_controller.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Directory temp;
  late File source;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    temp = await Directory.systemTemp.createTemp('app_bg_test');
    source = File('${temp.path}/source.jpg')..writeAsBytesSync([1, 2, 3]);
  });
  tearDown(() => temp.delete(recursive: true));

  AppBackgroundController build() =>
      AppBackgroundController(supportDir: () async => temp);

  test('setImage menyalin file dan menyimpan path per user', () async {
    final c = build();
    await c.loadForUser('user-a');
    await c.setImage(source.path);
    expect(c.imagePath, isNotNull);
    expect(File(c.imagePath!).existsSync(), isTrue);
    final c2 = build();
    await c2.loadForUser('user-a');
    expect(c2.imagePath, c.imagePath);
  });

  test('loadForUser mengabaikan path yang filenya hilang', () async {
    SharedPreferences.setMockInitialValues({
      'app_background_path:user-a': '${temp.path}/hilang.jpg',
    });
    final c = build();
    await c.loadForUser('user-a');
    expect(c.imagePath, isNull);
  });

  test('pemilihan baru memakai nama unik dan menghapus file lama', () async {
    final c = build();
    await c.loadForUser('user-a');
    await c.setImage(source.path);
    final first = c.imagePath!;
    await c.setImage(source.path);
    expect(c.imagePath, isNot(first));
    expect(File(first).existsSync(), isFalse);
  });

  test('latar terpisah antar akun dan reset tidak menghapus file', () async {
    final c = build();
    await c.loadForUser('user-a');
    await c.setImage(source.path);
    final path = c.imagePath!;
    await c.loadForUser('user-b');
    expect(c.imagePath, isNull);
    c.reset();
    expect(c.imagePath, isNull);
    await c.loadForUser('user-a');
    expect(c.imagePath, path);
  });

  test('clear menghapus file dan preferensi user aktif', () async {
    final c = build();
    await c.loadForUser('user-a');
    await c.setImage(source.path);
    final path = c.imagePath!;
    await c.clear();
    expect(c.imagePath, isNull);
    expect(File(path).existsSync(), isFalse);
  });
}
