/**
 * E2E test helpers — re-exports for convenient importing.
 *
 * Usage:
 *   import { mockAuth, MOCK_USER, registerMembersMocks } from '../helpers';
 *   import { mockAuthWithAll } from '../helpers';
 */

// Core auth
export { mockAuth, mockLoginError, mockAuthWithAll, MOCK_USER } from './auth';

// Domain-specific mocks
export { registerMembersMocks } from './members';
export { registerTrainingsMocks } from './trainings';
export { registerGamificationMocks } from './gamification';
export { registerImportMocks } from './import';
export { registerCandidatesMocks } from './candidates';
export { registerRegistrationMocks } from './registration';
export { registerDocumentsMocks, getMockBatchId } from './documents';
