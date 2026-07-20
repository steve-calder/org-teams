import { db } from '$lib/server/db';
import { createPersonRepository } from './repository-core';

export { createPersonRepository } from './repository-core';

const personRepository = createPersonRepository(db);

export const findPersonByAuthUserId = personRepository.findPersonByAuthUserId;
export const ensurePersonForAuthUser = personRepository.ensurePersonForAuthUser;
