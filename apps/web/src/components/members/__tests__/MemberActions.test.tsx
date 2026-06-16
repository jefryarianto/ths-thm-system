import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MemberActions from '../MemberActions';

describe('MemberActions', () => {
  const defaultMember = {
    id: 'member-1',
    statusValidasi: 'pending',
    statusKeanggotaan: 'aktif',
  };
  const onAction = vi.fn();
  const onViewDetail = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders approve button when statusValidasi is pending', () => {
    render(
      <MemberActions
        member={defaultMember}
        actionLoading={null}
        onAction={onAction}
        onViewDetail={onViewDetail}
      />,
    );
    const approveBtn = screen.getByTitle('Setujui');
    expect(approveBtn).toBeInTheDocument();
  });

  it('renders suspend button when statusKeanggotaan is aktif', () => {
    render(
      <MemberActions
        member={defaultMember}
        actionLoading={null}
        onAction={onAction}
        onViewDetail={onViewDetail}
      />,
    );
    expect(screen.getByTitle('Nonaktifkan')).toBeInTheDocument();
  });

  it('renders reactivate button when statusKeanggotaan is nonaktif', () => {
    render(
      <MemberActions
        member={{ ...defaultMember, statusKeanggotaan: 'nonaktif' }}
        actionLoading={null}
        onAction={onAction}
        onViewDetail={onViewDetail}
      />,
    );
    expect(screen.getByTitle('Aktifkan kembali')).toBeInTheDocument();
  });

  it('does not render approve button when statusValidasi is not pending', () => {
    render(
      <MemberActions
        member={{ ...defaultMember, statusValidasi: 'approved' }}
        actionLoading={null}
        onAction={onAction}
        onViewDetail={onViewDetail}
      />,
    );
    expect(screen.queryByTitle('Setujui')).not.toBeInTheDocument();
  });

  it('does not render suspend/reactivate when status is neither aktif nor nonaktif', () => {
    render(
      <MemberActions
        member={{ ...defaultMember, statusKeanggotaan: 'pindah' }}
        actionLoading={null}
        onAction={onAction}
        onViewDetail={onViewDetail}
      />,
    );
    expect(screen.queryByTitle('Nonaktifkan')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Aktifkan kembali')).not.toBeInTheDocument();
  });

  it('calls onAction with correct args when approve is clicked', () => {
    render(
      <MemberActions
        member={defaultMember}
        actionLoading={null}
        onAction={onAction}
        onViewDetail={onViewDetail}
      />,
    );
    fireEvent.click(screen.getByTitle('Setujui'));
    expect(onAction).toHaveBeenCalledWith('member-1', 'approve');
  });

  it('calls onAction with suspend when suspend button clicked', () => {
    render(
      <MemberActions
        member={defaultMember}
        actionLoading={null}
        onAction={onAction}
        onViewDetail={onViewDetail}
      />,
    );
    fireEvent.click(screen.getByTitle('Nonaktifkan'));
    expect(onAction).toHaveBeenCalledWith('member-1', 'suspend');
  });

  it('calls onViewDetail when detail button clicked', () => {
    render(
      <MemberActions
        member={defaultMember}
        actionLoading={null}
        onAction={onAction}
        onViewDetail={onViewDetail}
      />,
    );
    fireEvent.click(screen.getByTitle('Detail'));
    expect(onViewDetail).toHaveBeenCalledWith('member-1');
  });

  it('disables action buttons when actionLoading matches member id', () => {
    render(
      <MemberActions
        member={defaultMember}
        actionLoading="member-1"
        onAction={onAction}
        onViewDetail={onViewDetail}
      />,
    );
    // Approve and suspend buttons should be disabled
    expect(screen.getByTitle('Setujui')).toBeDisabled();
    expect(screen.getByTitle('Nonaktifkan')).toBeDisabled();
    // Detail button should NOT be disabled (it doesn't accept disabled)
    expect(screen.getByTitle('Detail')).not.toBeDisabled();
  });

  it('renders detail button always', () => {
    render(
      <MemberActions
        member={defaultMember}
        actionLoading={null}
        onAction={onAction}
        onViewDetail={onViewDetail}
      />,
    );
    expect(screen.getByTitle('Detail')).toBeInTheDocument();
  });
});
