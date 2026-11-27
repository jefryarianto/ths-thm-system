import {
  buildPublicClaimFormData,
  type PublicClaimFile,
  type PublicClaimFormValues,
} from './public-claim-payload';

export function buildAdminClaimFormData(
  form: PublicClaimFormValues,
  rantingId: string,
  files: PublicClaimFile[],
): FormData {
  return buildPublicClaimFormData(form, rantingId, files);
}
