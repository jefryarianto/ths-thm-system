class User {
  final String id;
  final String email;
  final String namaLengkap;
  final String role;

  User({
    required this.id,
    required this.email,
    required this.namaLengkap,
    required this.role,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      namaLengkap: json['namaLengkap'] as String,
      role: json['role'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'namaLengkap': namaLengkap,
      'role': role,
    };
  }
}
