enum KtaAppStatus {
  submitted,
  rantingReview,
  wilayahReview,
  distrikReview,
  nasionalReview,
  approved,
  paymentSetup,
  paymentPending,
  paymentVerified,
  cardGenerating,
  cardGenerated,
  rejected,
  cancelled,
}

enum KtaAppLevel { ranting, wilayah, distrik, nasional, member }

enum KtaAppAction {
  submitted,
  approved,
  rejected,
  forwarded,
  skipped,
  paymentSetup,
  paymentVerified,
  cardGenerated,
  cancelled,
  superadminBypass,
}

class KtaApplication {
  final String id;
  final String anggotaId;
  final String? nomorAnggota;
  final KtaAppStatus status;
  final double? biaya;
  final String? rekeningTujuan;
  final String? buktiBayarPath;
  final String statusPembayaran;
  final String? diterbitkanOleh;
  final DateTime? diterbitkanAt;
  final String submittedByRole;
  final String? batchId;
  final String? catatanAdmin;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<KtaAppHistory> histories;

  const KtaApplication({
    required this.id,
    required this.anggotaId,
    this.nomorAnggota,
    required this.status,
    this.biaya,
    this.rekeningTujuan,
    this.buktiBayarPath,
    this.statusPembayaran = '',
    this.diterbitkanOleh,
    this.diterbitkanAt,
    this.submittedByRole = '',
    this.batchId,
    this.catatanAdmin,
    required this.createdAt,
    required this.updatedAt,
    this.histories = const [],
  });

  factory KtaApplication.fromJson(Map<String, dynamic> json) {
    final rawHistories = json['histories'];
    final histories = rawHistories is List
        ? rawHistories
            .whereType<Map<String, dynamic>>()
            .map(KtaAppHistory.fromJson)
            .toList()
        : <KtaAppHistory>[];

    return KtaApplication(
      id: json['id']?.toString() ?? '',
      anggotaId: json['anggotaId']?.toString() ?? '',
      nomorAnggota: json['nomorAnggota']?.toString(),
      status: _parseStatus(json['status']?.toString() ?? ''),
      biaya: (json['biaya'] as num?)?.toDouble(),
      rekeningTujuan: json['rekeningTujuan']?.toString(),
      buktiBayarPath: json['buktiBayarPath']?.toString(),
      statusPembayaran: json['statusPembayaran']?.toString() ?? '',
      diterbitkanOleh: json['diterbitkanOleh']?.toString(),
      diterbitkanAt: json['diterbitkanAt'] != null
          ? DateTime.tryParse(json['diterbitkanAt'].toString())
          : null,
      submittedByRole: json['submittedByRole']?.toString() ?? '',
      batchId: json['batchId']?.toString(),
      catatanAdmin: json['catatanAdmin']?.toString(),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ?? DateTime.now(),
      histories: histories,
    );
  }

  static KtaAppStatus _parseStatus(String status) {
    switch (status.toLowerCase()) {
      case 'submitted':
        return KtaAppStatus.submitted;
      case 'ranting_review':
        return KtaAppStatus.rantingReview;
      case 'wilayah_review':
        return KtaAppStatus.wilayahReview;
      case 'distrik_review':
        return KtaAppStatus.distrikReview;
      case 'nasional_review':
        return KtaAppStatus.nasionalReview;
      case 'approved':
        return KtaAppStatus.approved;
      case 'payment_setup':
        return KtaAppStatus.paymentSetup;
      case 'payment_pending':
        return KtaAppStatus.paymentPending;
      case 'payment_verified':
        return KtaAppStatus.paymentVerified;
      case 'card_generating':
        return KtaAppStatus.cardGenerating;
      case 'card_generated':
        return KtaAppStatus.cardGenerated;
      case 'rejected':
        return KtaAppStatus.rejected;
      case 'cancelled':
        return KtaAppStatus.cancelled;
      default:
        return KtaAppStatus.submitted;
    }
  }

  String get statusLabel {
    switch (status) {
      case KtaAppStatus.submitted:
        return 'Diajukan';
      case KtaAppStatus.rantingReview:
        return 'Review Ranting';
      case KtaAppStatus.wilayahReview:
        return 'Review Wilayah';
      case KtaAppStatus.distrikReview:
        return 'Review Distrik';
      case KtaAppStatus.nasionalReview:
        return 'Review Nasional';
      case KtaAppStatus.approved:
        return 'Disetujui Nasional';
      case KtaAppStatus.paymentSetup:
        return 'Biaya Diatur';
      case KtaAppStatus.paymentPending:
        return 'Menunggu Pembayaran';
      case KtaAppStatus.paymentVerified:
        return 'Pembayaran Diverifikasi';
      case KtaAppStatus.cardGenerating:
        return 'Generate Kartu';
      case KtaAppStatus.cardGenerated:
        return 'Kartu Siap';
      case KtaAppStatus.rejected:
        return 'Ditolak';
      case KtaAppStatus.cancelled:
        return 'Dibatalkan';
    }
  }

  String get statusColorHex {
    switch (status) {
      case KtaAppStatus.submitted:
        return '64748B';
      case KtaAppStatus.rantingReview:
      case KtaAppStatus.wilayahReview:
      case KtaAppStatus.distrikReview:
      case KtaAppStatus.nasionalReview:
        return 'F59E0B';
      case KtaAppStatus.approved:
      case KtaAppStatus.paymentVerified:
        return '10B981';
      case KtaAppStatus.paymentSetup:
      case KtaAppStatus.paymentPending:
      case KtaAppStatus.cardGenerating:
        return '3B82F6';
      case KtaAppStatus.cardGenerated:
        return '8B5CF6';
      case KtaAppStatus.rejected:
      case KtaAppStatus.cancelled:
        return 'EF4444';
    }
  }

  bool get isCompleted => status == KtaAppStatus.cardGenerated;
  bool get isRejected => status == KtaAppStatus.rejected || status == KtaAppStatus.cancelled;
  bool get isInProgress => !isCompleted && !isRejected;
}

class KtaAppHistory {
  final String id;
  final String ktaApplicationId;
  final KtaAppLevel level;
  final KtaAppAction action;
  final String actorId;
  final String actorRole;
  final String? catatan;
  final bool isSkipped;
  final String? skippedReason;
  final DateTime createdAt;

  const KtaAppHistory({
    required this.id,
    required this.ktaApplicationId,
    required this.level,
    required this.action,
    required this.actorId,
    this.actorRole = '',
    this.catatan,
    this.isSkipped = false,
    this.skippedReason,
    required this.createdAt,
  });

  factory KtaAppHistory.fromJson(Map<String, dynamic> json) {
    return KtaAppHistory(
      id: json['id']?.toString() ?? '',
      ktaApplicationId: json['ktaApplicationId']?.toString() ?? '',
      level: _parseLevel(json['level']?.toString() ?? ''),
      action: _parseAction(json['action']?.toString() ?? ''),
      actorId: json['actorId']?.toString() ?? '',
      actorRole: json['actorRole']?.toString() ?? '',
      catatan: json['catatan']?.toString(),
      isSkipped: json['isSkipped'] as bool? ?? false,
      skippedReason: json['skippedReason']?.toString(),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  static KtaAppLevel _parseLevel(String level) {
    switch (level.toLowerCase()) {
      case 'ranting':
        return KtaAppLevel.ranting;
      case 'wilayah':
        return KtaAppLevel.wilayah;
      case 'distrik':
        return KtaAppLevel.distrik;
      case 'nasional':
        return KtaAppLevel.nasional;
      default:
        return KtaAppLevel.member;
    }
  }

  static KtaAppAction _parseAction(String action) {
    switch (action.toLowerCase()) {
      case 'submitted':
        return KtaAppAction.submitted;
      case 'approved':
        return KtaAppAction.approved;
      case 'rejected':
        return KtaAppAction.rejected;
      case 'forwarded':
        return KtaAppAction.forwarded;
      case 'skipped':
        return KtaAppAction.skipped;
      case 'payment_setup':
        return KtaAppAction.paymentSetup;
      case 'payment_verified':
        return KtaAppAction.paymentVerified;
      case 'card_generated':
        return KtaAppAction.cardGenerated;
      case 'cancelled':
        return KtaAppAction.cancelled;
      case 'superadmin_bypass':
        return KtaAppAction.superadminBypass;
      default:
        return KtaAppAction.submitted;
    }
  }

  String get levelLabel {
    switch (level) {
      case KtaAppLevel.ranting:
        return 'Ranting';
      case KtaAppLevel.wilayah:
        return 'Wilayah';
      case KtaAppLevel.distrik:
        return 'Distrik';
      case KtaAppLevel.nasional:
        return 'Nasional';
      case KtaAppLevel.member:
        return 'Anggota';
    }
  }

  String get actionLabel {
    switch (action) {
      case KtaAppAction.submitted:
        return 'Diajukan';
      case KtaAppAction.approved:
        return 'Disetujui';
      case KtaAppAction.rejected:
        return 'Ditolak';
      case KtaAppAction.forwarded:
        return 'Diteruskan';
      case KtaAppAction.skipped:
        return 'Di-skip';
      case KtaAppAction.paymentSetup:
        return 'Biaya Diatur';
      case KtaAppAction.paymentVerified:
        return 'Pembayaran Diverifikasi';
      case KtaAppAction.cardGenerated:
        return 'Kartu Digenerate';
      case KtaAppAction.cancelled:
        return 'Dibatalkan';
      case KtaAppAction.superadminBypass:
        return 'SuperAdmin Bypass';
    }
  }
}

class KtaBatch {
  final String id;
  final String? name;
  final String submittedByRole;
  final String scopeLevel;
  final int totalSubmitted;
  final int totalApproved;
  final int totalRejected;
  final int totalGenerated;
  final String status;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<KtaApplication>? applications;

  const KtaBatch({
    required this.id,
    this.name,
    this.submittedByRole = '',
    this.scopeLevel = '',
    this.totalSubmitted = 0,
    this.totalApproved = 0,
    this.totalRejected = 0,
    this.totalGenerated = 0,
    this.status = '',
    required this.createdAt,
    required this.updatedAt,
    this.applications,
  });

  factory KtaBatch.fromJson(Map<String, dynamic> json) {
    final rawApps = json['applications'];
    final applications = rawApps is List
        ? rawApps.whereType<Map<String, dynamic>>().map(KtaApplication.fromJson).toList()
        : null;

    return KtaBatch(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString(),
      submittedByRole: json['submittedByRole']?.toString() ?? '',
      scopeLevel: json['scopeLevel']?.toString() ?? '',
      totalSubmitted: json['totalSubmitted'] as int? ?? 0,
      totalApproved: json['totalApproved'] as int? ?? 0,
      totalRejected: json['totalRejected'] as int? ?? 0,
      totalGenerated: json['totalGenerated'] as int? ?? 0,
      status: json['status']?.toString() ?? '',
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ?? DateTime.now(),
      applications: applications,
    );
  }

  String get statusLabel {
    switch (status) {
      case 'COMPLETED':
        return 'Selesai';
      case 'IN_PROGRESS':
        return 'Berlangsung';
      case 'PARTIAL':
        return 'Sebagian';
      default:
        return status;
    }
  }

  double get progress => totalSubmitted == 0 ? 0 : (totalApproved / totalSubmitted);
}
