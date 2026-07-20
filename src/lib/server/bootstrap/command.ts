import { createAuthCore } from '$lib/server/auth-core';
import { createDatabase } from '$lib/server/db/factory';
import { createPersonRepository } from '$lib/server/people/repository-core';
import {
	bootstrapProductionAdmin,
	BootstrapConfigurationError,
	BootstrapExecutionError,
	parseBootstrapAdminConfig,
	type BootstrapAdminConfig,
	type BootstrapAdminResult
} from './admin';

interface CommandEnvironment extends Record<string, string | undefined> {
	DATABASE_URL?: string;
	ORIGIN?: string;
	BETTER_AUTH_SECRET?: string;
}

interface BootstrapCommandOptions {
	environment: CommandEnvironment;
	arguments?: string[];
	stdout?: (message: string) => void;
	stderr?: (message: string) => void;
	execute?: (
		environment: CommandEnvironment,
		config: BootstrapAdminConfig
	) => Promise<BootstrapAdminResult>;
}

function requiredApplicationValue(environment: CommandEnvironment, name: keyof CommandEnvironment) {
	const value = environment[name]?.trim();
	if (!value) throw new BootstrapConfigurationError(`${String(name)} is required.`);
	return value;
}

async function executeBootstrap(
	environment: CommandEnvironment,
	config: BootstrapAdminConfig
): Promise<BootstrapAdminResult> {
	const databaseUrl = requiredApplicationValue(environment, 'DATABASE_URL');
	const secret = requiredApplicationValue(environment, 'BETTER_AUTH_SECRET');
	const connection = createDatabase(databaseUrl);
	try {
		const people = createPersonRepository(connection.db);
		const auth = createAuthCore(
			{
				database: connection.db,
				baseURL: environment.ORIGIN?.trim() || undefined,
				secret,
				ensurePersonForAuthUser: people.ensurePersonForAuthUser
			},
			[]
		);
		return await bootstrapProductionAdmin(
			{
				database: connection.db,
				auth,
				ensurePersonForAuthUser: people.ensurePersonForAuthUser
			},
			config
		);
	} finally {
		await connection.client.end();
	}
}

export function bootstrapResultMessage(result: BootstrapAdminResult): string {
	switch (result.status) {
		case 'created':
			return `Initial administrator created for ${result.email}.`;
		case 'repaired':
			return `Initial administrator bootstrap repaired for ${result.email}.`;
		case 'already-initialized':
			return `Administrator ${result.email} is already initialized.`;
		case 'refused':
			return result.reason === 'administrator-exists'
				? 'Bootstrap refused because another administrator already exists.'
				: 'Bootstrap refused because the configured identity has conflicting data.';
	}
}

export async function runBootstrapAdminCommand(options: BootstrapCommandOptions): Promise<number> {
	const stdout = options.stdout ?? console.log;
	const stderr = options.stderr ?? console.error;
	try {
		if ((options.arguments?.length ?? 0) > 0) {
			throw new BootstrapConfigurationError(
				'Administrator bootstrap does not accept command-line arguments; use environment secrets.'
			);
		}
		const config = parseBootstrapAdminConfig(options.environment);
		const result = await (options.execute ?? executeBootstrap)(options.environment, config);
		const message = bootstrapResultMessage(result);
		if (result.status === 'refused') {
			stderr(message);
			return 2;
		}
		stdout(message);
		return 0;
	} catch (error) {
		if (error instanceof BootstrapConfigurationError || error instanceof BootstrapExecutionError) {
			stderr(error.message);
		} else {
			stderr('Administrator bootstrap failed without exposing diagnostic secrets.');
		}
		return 1;
	}
}
