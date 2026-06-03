import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
export enum ClaimDecision {
  APPROVE = 'approve',
  REJECT = 'reject',
}
export class ClaimDecisionDto {
  @IsNotEmpty()
  @IsEnum(ClaimDecision)
  decision: ClaimDecision;

  @IsString()
  @IsNotEmpty()
  notes?: string;
}
