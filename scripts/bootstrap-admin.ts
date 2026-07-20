import { runBootstrapAdminCommand } from '../src/lib/server/bootstrap/command';

process.exitCode = await runBootstrapAdminCommand({
	environment: process.env,
	arguments: process.argv.slice(2)
});
