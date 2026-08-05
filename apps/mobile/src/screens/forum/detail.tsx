import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useForumThread, createForumPost, deleteForumPost, updateForumPost, markAsSolution, togglePinThread, toggleLockThread, useCurrentMemberId } from '../../hooks/use-forum';
import { useRole } from '../../hooks/use-role';
import { LoadingView, ScreenShell } from '../../components/ui/shared';

export default function ForumThreadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useRole();
  const { data: thread, loading, refetch } = useForumThread(id!);
  const { data: currentMemberId } = useCurrentMemberId();
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSubmitting(true);
    try {
      await createForumPost(id!, reply.trim());
      setReply('');
      refetch();
    } catch (err: any) {
      Alert.alert('Gagal', err?.response?.data?.message || 'Gagal mengirim balasan');
    }
    setSubmitting(false);
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert('Hapus Balasan', 'Yakin ingin menghapus balasan ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteForumPost(postId);
            refetch();
          } catch {
            Alert.alert('Gagal', 'Tidak dapat menghapus balasan');
          }
        },
      },
    ]);
  };

  const handleEditPost = async (postId: string) => {
    if (!editContent.trim()) return;
    try {
      await updateForumPost(postId, editContent.trim());
      setEditingPostId(null);
      setEditContent('');
      refetch();
    } catch (err: any) {
      Alert.alert('Gagal', err?.response?.data?.message || 'Gagal memperbarui balasan');
    }
  };

  const handleMarkSolution = async (postId: string) => {
    try {
      await markAsSolution(postId, id!);
      refetch();
    } catch (err: any) {
      Alert.alert('Gagal', err?.response?.data?.message || 'Gagal menandai solusi');
    }
  };

  const handlePin = async () => {
    try {
      await togglePinThread(id!);
      refetch();
    } catch { /* ignore */ }
  };

  const handleLock = async () => {
    try {
      await toggleLockThread(id!);
      refetch();
    } catch { /* ignore */ }
  };

  if (loading) return <LoadingView message="Memuat thread..." />;
  if (!thread) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Thread tidak ditemukan</Text>
      </View>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const posts = thread.posts || [];

  return (
    <ScreenShell title={thread.judul} variant="detail">
      {/* Category breadcrumb */}
        <View style={styles.breadcrumb}>
          <TouchableOpacity onPress={() => router.push('/forum')}>
            <Text style={styles.breadcrumbLink}>Forum</Text>
          </TouchableOpacity>
          <Text style={styles.breadcrumbSep}> / </Text>
          {thread.category && (
            <>
              <TouchableOpacity
                onPress={() =>
                  router.push(
                    `/forum/c/${thread.category!.id}` as any,
                  )
                }
              >
                <Text style={styles.breadcrumbLink}>{thread.category.nama}</Text>
              </TouchableOpacity>
              <Text style={styles.breadcrumbSep}> / </Text>
            </>
          )}
          <Text style={styles.breadcrumbCurrent} numberOfLines={1}>
            {thread.judul}
          </Text>
        </View>

        {/* Original Thread */}
        <View style={styles.threadCard}>
          <View style={styles.threadHeader}>
            <View style={styles.titleRow}>
              {thread.isPinned && <Ionicons name="pin" size={16} color="#2563eb" />}
              {thread.isLocked && <Ionicons name="lock-closed" size={16} color="#ef4444" />}
            </View>
            <View style={styles.threadAuthor}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {thread.author?.namaLengkap?.charAt(0) || '?'}
                </Text>
              </View>
              <View>
                <Text style={styles.authorName}>{thread.author?.namaLengkap}</Text>
                <Text style={styles.dateText}>{formatDate(thread.createdAt)}</Text>
              </View>
              <View style={styles.viewCount}>
                <Ionicons name="eye" size={14} color="#9ca3af" />
                <Text style={styles.viewCountText}>{thread.viewCount}</Text>
              </View>
            </View>
          </View>
          <View style={styles.kontenBox}>
            <Text style={styles.kontenText}>{thread.konten}</Text>
          </View>
          {isAdmin && (
            <View style={styles.adminActions}>
              <TouchableOpacity
                style={styles.adminBtn}
                onPress={handlePin}
              >
                <Ionicons
                  name="pin"
                  size={14}
                  color={thread.isPinned ? '#2563eb' : '#6b7280'}
                />
                <Text style={styles.adminBtnText}>
                  {thread.isPinned ? 'Unpin' : 'Pin'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adminBtn}
                onPress={handleLock}
              >
                <Ionicons
                  name="lock-closed"
                  size={14}
                  color={thread.isLocked ? '#ef4444' : '#6b7280'}
                />
                <Text style={styles.adminBtnText}>
                  {thread.isLocked ? 'Unlock' : 'Lock'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Posts */}
        <Text style={styles.sectionTitle}>
          {posts.length} Balasan
        </Text>

        {posts.map((post) => (
          <View
            key={post.id}
            style={[
              styles.postCard,
              post.isSolution && styles.postCardSolution,
            ]}
          >
            {post.isSolution && (
              <View style={styles.solutionBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                <Text style={styles.solutionBadgeText}>Solusi</Text>
              </View>
            )}

            <View style={styles.postHeader}>
              <View style={styles.postAuthor}>
                <View style={styles.avatarSmall}>
                  <Text style={styles.avatarSmallText}>
                    {post.author?.namaLengkap?.charAt(0) || '?'}
                  </Text>
                </View>
                <Text style={styles.postAuthorName}>{post.author?.namaLengkap}</Text>
                <Text style={styles.postDate}>
                  {new Date(post.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>

            {editingPostId === post.id ? (
              <View>
                <TextInput
                  style={styles.editInput}
                  value={editContent}
                  onChangeText={setEditContent}
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      setEditingPostId(null);
                      setEditContent('');
                    }}
                  >
                    <Text style={styles.cancelBtnText}>Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={() => handleEditPost(post.id)}
                  >
                    <Text style={styles.saveBtnText}>Simpan</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.postKonten}>{post.konten}</Text>
                {(() => {
                  const isPostAuthor = post.authorId === currentMemberId;
                  const isThreadAuthor = thread.authorId === currentMemberId;
                  const canManage = isPostAuthor || isAdmin;
                  const canMarkSolution = isThreadAuthor || isAdmin;
                  if (!canManage && !canMarkSolution) return null;
                  return (
                    <View style={styles.postActions}>
                      {canManage && (
                        <TouchableOpacity
                          style={styles.postActionBtn}
                          onPress={() => {
                            setEditingPostId(post.id);
                            setEditContent(post.konten);
                          }}
                        >
                          <Ionicons name="pencil" size={14} color="#6b7280" />
                        </TouchableOpacity>
                      )}
                      {canMarkSolution && (
                        <TouchableOpacity
                          style={styles.postActionBtn}
                          onPress={() => handleMarkSolution(post.id)}
                        >
                          <Ionicons name="checkmark-circle-outline" size={14} color="#6b7280" />
                        </TouchableOpacity>
                      )}
                      {canManage && (
                        <TouchableOpacity
                          style={styles.postActionBtn}
                          onPress={() => handleDeletePost(post.id)}
                        >
                          <Ionicons name="trash-outline" size={14} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })()}
              </>
            )}
          </View>
        ))}

        {/* Reply Form */}
        {!thread.isLocked && (
          <View style={styles.replyCard}>
            <Text style={styles.replyTitle}>Tulis Balasan</Text>
            <TextInput
              style={styles.replyInput}
              value={reply}
              onChangeText={setReply}
              placeholder="Tulis balasan..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
            />
            <View style={styles.replyActions}>
              <TouchableOpacity
                style={[styles.sendBtn, submitting && styles.btnDisabled]}
                onPress={handleReply}
                disabled={submitting || !reply.trim()}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="send" size={16} color="#fff" />
                    <Text style={styles.sendBtnText}>Kirim Balasan</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {thread.isLocked && (
          <View style={styles.lockedInfo}>
            <Ionicons name="lock-closed" size={18} color="#9ca3af" />
            <Text style={styles.lockedInfoText}>
              Thread ini dikunci. Tidak dapat menambah balasan baru.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6' },
  errorText: { fontSize: 14, color: '#ef4444' },

  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    flexWrap: 'wrap',
  },
  breadcrumbLink: { fontSize: 12, color: '#2563eb' },
  breadcrumbSep: { fontSize: 12, color: '#9ca3af' },
  breadcrumbCurrent: { fontSize: 12, color: '#6b7280', flex: 1 },

  threadCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  threadHeader: {},
  titleRow: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  threadAuthor: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  authorName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  dateText: { fontSize: 11, color: '#9ca3af' },
  viewCount: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  viewCountText: { fontSize: 11, color: '#9ca3af' },
  kontenBox: { marginTop: 12 },
  kontenText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  adminActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  adminBtnText: { fontSize: 12, color: '#6b7280' },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  postCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 6,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  postCardSolution: {
    borderColor: '#86efac',
    borderWidth: 2,
  },
  solutionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  solutionBadgeText: { fontSize: 12, fontWeight: '600', color: '#16a34a' },
  postHeader: { marginBottom: 8 },
  postAuthor: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmallText: { fontSize: 11, fontWeight: '700', color: '#2563eb' },
  postAuthorName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  postDate: { fontSize: 10, color: '#9ca3af', marginLeft: 'auto' },
  postKonten: { fontSize: 13, color: '#374151', lineHeight: 19 },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  postActionBtn: { padding: 4 },

  editInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#111827',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
  },
  cancelBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  saveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  saveBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  replyCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  replyTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 8 },
  replyInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 72,
    textAlignVertical: 'top',
  },
  replyActions: { alignItems: 'flex-end', marginTop: 12 },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  sendBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  btnDisabled: { opacity: 0.5 },

  lockedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f3f4f6',
    margin: 16,
    padding: 14,
    borderRadius: 10,
  },
  lockedInfoText: { fontSize: 13, color: '#6b7280', flex: 1 },
});
