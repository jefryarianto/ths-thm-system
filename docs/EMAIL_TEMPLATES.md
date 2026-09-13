# Email Templates for THS-THM System

These templates are defined in `apps/api/src/mail/email-templates.ts`. You can customize them directly in that file.

1.  **Welcome Member (`welcomeMemberEmail`):**
    - Subject: 'Selamat Datang di THS-THM!'
    - Content: Welcomes new member, provides instructions on what to do next.

2.  **Approved Member (`approvedMemberEmail`):**
    - Subject: 'Selamat! Anda Telah Menjadi Anggota THS-THM'
    - Content: Confirms membership, includes Member Number.

3.  **Rejected Member (`rejectedMemberEmail`):**
    - Subject: 'Pemberitahuan — THS-THM'
    - Content: Informs user that registration/candidacy failed, with optional reason.

4.  **Registration Approved (`registrationApprovedEmail`):**
    - Subject: 'Pendaftaran Anda Disetujui — THS-THM'
    - Content: Notifies user that registration is approved.

5.  **Reset Password (`resetPasswordEmail`):**
    - Subject: 'Reset Password — THS-THM System'
    - Content: Contains reset link valid for 1 hour.

6.  **Payment Confirmation (`paymentConfirmationEmail`):**
    - Subject: 'Konfirmasi Pembayaran Iuran' / 'Informasi Iuran'
    - Content: Confirms payment of dues or informs status.

7.  **Activity Invitation (`activityInvitationEmail`):**
    - Subject: 'Undangan Kegiatan'
    - Content: Details of the activity (name, date, location).

8.  **Training Notification (`trainingNotificationEmail`):**
    - Subject: 'Jadwal Latihan'
    - Content: Training schedule (material, date, location).

9.  **Attendance Confirmation (`attendanceConfirmationEmail`):**
    - Subject: 'Konfirmasi Kehadiran' / 'Ketidakhadiran'
    - Content: Confirms attendance for a specific training session.

10. **Document Ready (`documentReadyEmail`):**
    - Subject: 'Dokumen Siap'
    - Content: Notification that a document (e.g., membership card, certificate) is ready.

11. **Claim Status (`claimStatusEmail`):**
    - Subject: 'Update Klaim'
    - Content: Updates on claim status (approved, rejected, processed).

12. **Graduation Result (`graduationResultEmail`):**
    - Subject: 'Hasil Pendadaran'
    - Content: Notification of graduation status and score.

13. **Examiner Welcome/Assignment (`examinerWelcomeEmail`, `examinerAssignmentEmail`):**
    - Subject: 'Akun Penguji' / 'Penugasan Penguji'
    - Content: Welcome/assignment details for examiners.

14. **General Notification (`generalNotificationEmail`):**
    - Subject: '[THS-THM] ...'
    - Content: General purpose message.

15. **Badge/Level Up (`badgeEarnedEmail`, `levelUpEmail`):**
    - Subject: Notification of earned badges or level ups.
