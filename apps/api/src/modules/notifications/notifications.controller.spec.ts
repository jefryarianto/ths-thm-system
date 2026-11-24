import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { NotificationsController } from './notifications.controller';

describe('NotificationsController roles', () => {
  it('mengizinkan admin_berita pada GET /notifications/count', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      NotificationsController.prototype.getCount,
    ) as string[] | undefined;

    expect(roles).toContain('admin_berita');
  });
});
