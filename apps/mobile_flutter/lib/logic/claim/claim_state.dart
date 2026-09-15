part of 'claim_bloc.dart';

abstract class ClaimState extends Equatable {
  const ClaimState();
  @override
  List<Object?> get props => <Object?>[];
}

class ClaimInitial extends ClaimState {
  const ClaimInitial();
}

class ClaimLoading extends ClaimState {
  const ClaimLoading();
}

class ClaimSubmitting extends ClaimState {
  const ClaimSubmitting();
}

class ClaimActionInProgress extends ClaimState {
  const ClaimActionInProgress();
}

class ClaimLoaded extends ClaimState {
  final List<Claim> claims;
  const ClaimLoaded({required this.claims});
  @override
  List<Object?> get props => [claims];
}

class ClaimCreateSuccess extends ClaimState {
  const ClaimCreateSuccess();
}

class ClaimError extends ClaimState {
  final String message;
  const ClaimError({required this.message});
  @override
  List<Object?> get props => [message];
}
