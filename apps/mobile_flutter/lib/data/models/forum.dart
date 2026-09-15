/// Model Forum — memetakan langsung ke JSON dari `GET /forum/*`.
class ForumCategory {
  final String id;
  final String nama;
  final String deskripsi;
  final int order;
  final int threadCount;

  const ForumCategory({
    required this.id,
    required this.nama,
    required this.deskripsi,
    required this.order,
    required this.threadCount,
  });

  factory ForumCategory.fromJson(Map<String, dynamic> json) {
    final count = json['_count'];
    return ForumCategory(
      id: json['id']?.toString() ?? '',
      nama: json['nama']?.toString() ?? '',
      deskripsi: json['deskripsi']?.toString() ?? '',
      order: (json['order'] as num?)?.toInt() ?? 0,
      threadCount: count is Map<String, dynamic>
          ? (count['threads'] as num?)?.toInt() ?? 0
          : 0,
    );
  }
}

class ForumAuthor {
  final String id;
  final String namaLengkap;
  final String nomorAnggota;

  const ForumAuthor({
    required this.id,
    required this.namaLengkap,
    required this.nomorAnggota,
  });

  factory ForumAuthor.fromJson(Map<String, dynamic> json) => ForumAuthor(
        id: json['id']?.toString() ?? '',
        namaLengkap: json['namaLengkap']?.toString() ?? '',
        nomorAnggota: json['nomorAnggota']?.toString() ?? '',
      );
}

class ForumThread {
  final String id;
  final String categoryId;
  final String authorId;
  final String judul;
  final String konten;
  final bool isPinned;
  final bool isLocked;
  final int viewCount;
  final String createdAt;
  final String updatedAt;
  final ForumAuthor author;
  final ForumCategory? category;
  final int postCount;

  const ForumThread({
    required this.id,
    required this.categoryId,
    required this.authorId,
    required this.judul,
    required this.konten,
    required this.isPinned,
    required this.isLocked,
    required this.viewCount,
    required this.createdAt,
    required this.updatedAt,
    required this.author,
    this.category,
    required this.postCount,
  });

  factory ForumThread.fromJson(Map<String, dynamic> json) {
    final count = json['_count'];
    final rawAuthor = json['author'];
    final rawCategory = json['category'];
    return ForumThread(
      id: json['id']?.toString() ?? '',
      categoryId: json['categoryId']?.toString() ?? '',
      authorId: json['authorId']?.toString() ?? '',
      judul: json['judul']?.toString() ?? json['nama']?.toString() ?? '',
      konten: json['konten']?.toString() ?? '',
      isPinned: json['isPinned'] as bool? ?? false,
      isLocked: json['isLocked'] as bool? ?? false,
      viewCount: (json['viewCount'] as num?)?.toInt() ?? 0,
      createdAt: json['createdAt']?.toString() ?? '',
      updatedAt: json['updatedAt']?.toString() ?? '',
      author: rawAuthor is Map<String, dynamic>
          ? ForumAuthor.fromJson(rawAuthor)
          : const ForumAuthor(id: '', namaLengkap: 'Anggota', nomorAnggota: ''),
      category: rawCategory is Map<String, dynamic>
          ? ForumCategory.fromJson(rawCategory)
          : null,
      postCount: count is Map<String, dynamic>
          ? (count['posts'] as num?)?.toInt() ?? 0
          : 0,
    );
  }
}

class ForumPost {
  final String id;
  final String threadId;
  final String authorId;
  final String konten;
  final bool isSolution;
  final String createdAt;
  final String updatedAt;
  final ForumAuthor author;

  const ForumPost({
    required this.id,
    required this.threadId,
    required this.authorId,
    required this.konten,
    required this.isSolution,
    required this.createdAt,
    required this.updatedAt,
    required this.author,
  });

  factory ForumPost.fromJson(Map<String, dynamic> json) {
    final rawAuthor = json['author'];
    return ForumPost(
      id: json['id']?.toString() ?? '',
      threadId: json['threadId']?.toString() ?? '',
      authorId: json['authorId']?.toString() ?? '',
      konten: json['konten']?.toString() ?? '',
      isSolution: json['isSolution'] as bool? ?? false,
      createdAt: json['createdAt']?.toString() ?? '',
      updatedAt: json['updatedAt']?.toString() ?? '',
      author: rawAuthor is Map<String, dynamic>
          ? ForumAuthor.fromJson(rawAuthor)
          : const ForumAuthor(id: '', namaLengkap: 'Anggota', nomorAnggota: ''),
    );
  }
}
