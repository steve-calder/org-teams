import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { bootstrapResultMessage, runBootstrapAdminCommand } from '$lib/server/bootstrap/command';
import {
	BootstrapConfigurationError,
	parseBootstrapAdminConfig
} from '$lib/server/bootstrap/admin';

const validEnvironment = {
	DATABASE_URL: 'postgres://database.example.test/app',
	BETTER_AUTH_SECRET: 'a-secret-used-only-by-the-test',
	BOOTSTRAP_ADMIN_NAME: ' Initial Administrator ',
	BOOTSTRAP_ADMIN_EMAIL: ' ADMIN@Example.Test ',
	BOOTSTRAP_ADMIN_PASSWORD: 'super-secret-password'
};

describe('production administrator bootstrap command', () => {
	it('normalizes valid environment configuration without returning values in errors', () => {
		expect(parseBootstrapAdminConfig(validEnvironment)).toEqual({
			name: 'Initial Administrator',
			email: 'admin@example.test',
			password: 'super-secret-password'
		});

		for (const environment of [
			{ ...validEnvironment, BOOTSTRAP_ADMIN_NAME: '' },
			{ ...validEnvironment, BOOTSTRAP_ADMIN_EMAIL: 'invalid' },
			{ ...validEnvironment, BOOTSTRAP_ADMIN_PASSWORD: 'short' }
		]) {
			expect(() => parseBootstrapAdminConfig(environment)).toThrow(BootstrapConfigurationError);
			try {
				parseBootstrapAdminConfig(environment);
			} catch (error) {
				expect(String(error)).not.toContain('super-secret-password');
			}
		}
	});

	it('prints sanitized success and refusal results with useful exit codes', async () => {
		const stdout = vi.fn();
		const stderr = vi.fn();
		const execute = vi.fn().mockResolvedValue({
			status: 'created',
			email: 'admin@example.test'
		});

		expect(
			await runBootstrapAdminCommand({ environment: validEnvironment, stdout, stderr, execute })
		).toBe(0);
		expect(stdout).toHaveBeenCalledWith('Initial administrator created for admin@example.test.');
		expect(JSON.stringify([stdout.mock.calls, stderr.mock.calls])).not.toContain(
			'super-secret-password'
		);

		execute.mockResolvedValue({
			status: 'refused',
			reason: 'administrator-exists',
			email: 'admin@example.test'
		});
		expect(
			await runBootstrapAdminCommand({ environment: validEnvironment, stdout, stderr, execute })
		).toBe(2);
		expect(stderr).toHaveBeenLastCalledWith(
			'Bootstrap refused because another administrator already exists.'
		);
	});

	it('rejects arguments and sanitizes unexpected execution failures', async () => {
		const stderr = vi.fn();
		const execute = vi.fn().mockRejectedValue(new Error('super-secret-password'));

		expect(
			await runBootstrapAdminCommand({
				environment: validEnvironment,
				arguments: ['super-secret-password'],
				stderr,
				execute
			})
		).toBe(1);
		expect(execute).not.toHaveBeenCalled();
		expect(JSON.stringify(stderr.mock.calls)).not.toContain('super-secret-password');

		stderr.mockClear();
		expect(await runBootstrapAdminCommand({ environment: validEnvironment, stderr, execute })).toBe(
			1
		);
		expect(JSON.stringify(stderr.mock.calls)).not.toContain('super-secret-password');
	});

	it('keeps bootstrap configuration out of application startup and request handling', async () => {
		const [hooks, auth, developmentAccount, packageJson] = await Promise.all([
			readFile('src/hooks.server.ts', 'utf8'),
			readFile('src/lib/server/auth.ts', 'utf8'),
			readFile('src/lib/server/dev-account.ts', 'utf8'),
			readFile('package.json', 'utf8')
		]);

		expect(`${hooks}${auth}${developmentAccount}`).not.toContain('BOOTSTRAP_ADMIN_');
		expect(JSON.parse(packageJson).scripts['admin:bootstrap']).toBe(
			'tsx --env-file-if-exists=.env scripts/bootstrap-admin.ts'
		);
	});

	it('formats every result without accepting secret input', () => {
		expect(
			bootstrapResultMessage({ status: 'already-initialized', email: 'admin@example.test' })
		).toContain('already initialized');
		expect(bootstrapResultMessage({ status: 'repaired', email: 'admin@example.test' })).toContain(
			'repaired'
		);
		expect(
			bootstrapResultMessage({
				status: 'refused',
				reason: 'identity-conflict',
				email: 'admin@example.test'
			})
		).toContain('conflicting data');
	});
});
