import {
  EMAIL_TEMPLATE_REGISTRY,
  getTemplateDefinition,
  listTemplateDefinitions,
} from './template-registry';

describe('template-registry', () => {
  it('should register known email templates', () => {
    expect(EMAIL_TEMPLATE_REGISTRY).toBeDefined();
    for (const name of [
      'welcomeMemberEmail',
      'approvedMemberEmail',
      'registrationApprovedEmail',
      'registrationRejectedEmail',
      'candidateRejectedEmail',
      'resetPasswordEmail',
      'paymentConfirmationEmail',
      'activityInvitationEmail',
      'trainingNotificationEmail',
      'attendanceConfirmationEmail',
      'documentReadyEmail',
      'claimStatusEmail',
      'graduationResultEmail',
      'graduationRegisteredEmail',
      'generalNotificationEmail',
      'examinerWelcomeEmail',
      'examinerAssignmentEmail',
      'dispositionNotificationEmail',
      'userWelcomeEmail',
      'badgeEarnedEmail',
      'levelUpEmail',
    ]) {
      const def = EMAIL_TEMPLATE_REGISTRY[name];
      expect(def).toBeDefined();
      expect(def.label).toBeTruthy();
      expect(Array.isArray(def.variables)).toBe(true);
      for (const v of def.variables) {
        expect(v.name).toBeTruthy();
        expect(v.sample).toBeTruthy();
      }
    }
  });

  it('should render every default template without throwing', () => {
    for (const def of listTemplateDefinitions()) {
      const tpl = def.renderDefault();
      expect(tpl.subject).toBeTruthy();
      expect(tpl.html).toContain('<div');
    }
  });

  it('exposes claim tracking variables in the claim status preview', () => {
    const definition = EMAIL_TEMPLATE_REGISTRY.claimStatusEmail;
    expect(definition.variables.map((variable) => variable.name)).toContain('trackingUrl');

    const trackingUrl = 'https://ths-thm.cloud/klaim/token-123';
    const rendered = definition.renderDefault({
      alasan: 'Berkas lengkap',
      trackingUrl,
    } as never);

    expect(rendered.html).toContain(trackingUrl);
    expect(rendered.html).toContain('Berkas lengkap');
  });

  it('getTemplateDefinition should return undefined for unknown name', () => {
    expect(getTemplateDefinition('tidak-ada')).toBeUndefined();
  });

  it('listTemplateDefinitions should return all entries', () => {
    expect(listTemplateDefinitions()).toHaveLength(Object.keys(EMAIL_TEMPLATE_REGISTRY).length);
  });
});
