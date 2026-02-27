import { describe, it, expect } from 'vitest';
import { categorizeAction, AUTH_ACTIONS, ActionCategory } from './activityUtils';

describe('activityUtils', () => {
  describe('categorizeAction', () => {
    describe('error actions', () => {
      it('should categorize actions containing "fail" as error', () => {
        expect(categorizeAction('auth.login.failed')).toBe('error');
        expect(categorizeAction('registration.failed')).toBe('error');
        expect(categorizeAction('api.request.fail')).toBe('error');
      });

      it('should categorize actions containing "error" as error', () => {
        expect(categorizeAction('system.error')).toBe('error');
        expect(categorizeAction('validation.error')).toBe('error');
        expect(categorizeAction('error.occurred')).toBe('error');
      });
    });

    describe('auth actions', () => {
      it('should categorize "login" as auth', () => {
        expect(categorizeAction('login')).toBe('auth');
      });

      it('should categorize "logout" as auth', () => {
        expect(categorizeAction('logout')).toBe('auth');
      });

      it('should categorize "register" as auth', () => {
        expect(categorizeAction('register')).toBe('auth');
      });

      it('should categorize actions starting with "auth" as auth', () => {
        expect(categorizeAction('auth.token.refresh')).toBe('auth');
        expect(categorizeAction('auth.password.reset')).toBe('auth');
        expect(categorizeAction('auth.session.created')).toBe('auth');
      });
    });

    describe('system actions', () => {
      it('should categorize actions containing "schedule" as system', () => {
        expect(categorizeAction('task.schedule')).toBe('system');
        expect(categorizeAction('scheduled.job')).toBe('system');
      });

      it('should categorize actions containing "cleanup" as system', () => {
        expect(categorizeAction('session.cleanup')).toBe('system');
        expect(categorizeAction('cleanup.tokens')).toBe('system');
      });

      it('should categorize actions containing "maintenance" as system', () => {
        expect(categorizeAction('db.maintenance')).toBe('system');
        expect(categorizeAction('maintenance.window')).toBe('system');
      });
    });

    describe('crud actions', () => {
      it('should categorize standard CRUD operations as crud', () => {
        expect(categorizeAction('game.created')).toBe('crud');
        expect(categorizeAction('user.updated')).toBe('crud');
        expect(categorizeAction('playlist.deleted')).toBe('crud');
        expect(categorizeAction('favorite.added')).toBe('crud');
      });

      it('should categorize unknown actions as crud by default', () => {
        expect(categorizeAction('random.action')).toBe('crud');
        expect(categorizeAction('something')).toBe('crud');
        expect(categorizeAction('')).toBe('crud');
      });
    });

    describe('priority ordering', () => {
      // Error takes precedence over everything
      it('should prioritize error over auth', () => {
        expect(categorizeAction('auth.login.failed')).toBe('error');
      });

      it('should prioritize error over system', () => {
        expect(categorizeAction('schedule.error')).toBe('error');
        expect(categorizeAction('cleanup.failed')).toBe('error');
      });
    });
  });

  describe('AUTH_ACTIONS', () => {
    it('should contain expected auth actions', () => {
      expect(AUTH_ACTIONS).toContain('login');
      expect(AUTH_ACTIONS).toContain('logout');
      expect(AUTH_ACTIONS).toContain('register');
      expect(AUTH_ACTIONS).toContain('auth.login.failed');
    });

    it('should be readonly array', () => {
      expect(AUTH_ACTIONS).toHaveLength(4);
    });
  });
});
