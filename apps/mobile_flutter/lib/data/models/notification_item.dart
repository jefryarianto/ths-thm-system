class NotificationItem {
  final String id;
  final String judul;
  final String isi;
  final String tipe;
  final bool isRead;
  final String createdAt;
  final Map<String, dynamic>? data;

  const NotificationItem({
    required this.id,
    required this.judul,
    required this.isi,
    required this.tipe,
    required this.isRead,
    required this.createdAt,
    this.data,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: _str(json['id']),
      judul: _str(json['judul']),
      isi: _str(json['isi']),
      tipe: _str(json['tipe']),
      isRead: json['isRead'] == true || json['read'] == true,
      createdAt: _str(json['createdAt']),
      data: json['data'] is Map<String, dynamic>
          ? (json['data'] as Map<String, dynamic>)
          : null,
    );
  }

  static String _str(dynamic v) => v == null ? '' : v.toString();
}
