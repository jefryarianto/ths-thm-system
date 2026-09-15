import 'package:equatable/equatable.dart';
import '../../data/models/graduation.dart';

abstract class AssessmentState extends Equatable {
  const AssessmentState();

  @override
  List<Object?> get props => <Object?>[];
}

class AssessmentInitial extends AssessmentState {
  const AssessmentInitial();
}

class AssessmentLoading extends AssessmentState {
  const AssessmentLoading();
}

class AssessmentLoaded extends AssessmentState {
  final List<AssessmentAspect> aspects;
  final List<AssessmentItem> items;
  const AssessmentLoaded({this.aspects = const [], this.items = const []});

  @override
  List<Object?> get props => <Object?>[aspects, items];
}

class AssessmentAspectSaved extends AssessmentState {
  final String message;
  const AssessmentAspectSaved(this.message);
  @override
  List<Object?> get props => <Object?>[message];
}

class AssessmentItemSaved extends AssessmentState {
  final String message;
  const AssessmentItemSaved(this.message);
  @override
  List<Object?> get props => <Object?>[message];
}

class AssessmentError extends AssessmentState {
  final String message;
  const AssessmentError(this.message);
  @override
  List<Object?> get props => <Object?>[message];
}
