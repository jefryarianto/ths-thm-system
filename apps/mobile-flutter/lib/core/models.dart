class AppUser {
  const AppUser({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
  });

  final String id;
  final String email;
  final String name;
  final String role;

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: '${json['id'] ?? ''}',
        email: '${json['email'] ?? ''}',
        name: '${json['namaLengkap'] ?? json['name'] ?? json['email'] ?? 'Pengguna'}',
        role: '${json['role'] ?? 'anggota'}',
      );
}

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}
