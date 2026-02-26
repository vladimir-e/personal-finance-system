import { faker } from '@faker-js/faker';
import type { DataStoreMutations } from '../store/DataStoreContext';
import type { AccountType, DataStore, TransactionType } from 'pfs-lib';

function getMonthString(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function randomDate(): string {
  const monthOffset = faker.helpers.arrayElement([0, 0, 0, -1, -1, -2]);
  const month = getMonthString(monthOffset);
  const maxDay = monthOffset === 0 ? Math.min(new Date().getDate(), 28) : 28;
  const day = faker.number.int({ min: 1, max: maxDay });
  return `${month}-${String(day).padStart(2, '0')}`;
}

function randomDescription(): string {
  const style = faker.helpers.weightedArrayElement([
    { value: 'empty', weight: 5 },
    { value: 'short', weight: 20 },
    { value: 'normal', weight: 50 },
    { value: 'long', weight: 15 },
    { value: 'extreme', weight: 10 },
  ]);

  switch (style) {
    case 'empty': return '';
    case 'short': return faker.word.noun();
    case 'normal': return faker.commerce.productName();
    case 'long': return faker.lorem.sentence({ min: 8, max: 15 });
    case 'extreme': return faker.lorem.words(20) + ' \u{1F4B0} #' + faker.number.int(99999);
    default: return '';
  }
}

function randomPayee(): string {
  const style = faker.helpers.weightedArrayElement([
    { value: 'empty', weight: 15 },
    { value: 'short', weight: 30 },
    { value: 'normal', weight: 40 },
    { value: 'long', weight: 15 },
  ]);

  switch (style) {
    case 'empty': return '';
    case 'short': return faker.person.lastName();
    case 'normal': return faker.company.name();
    case 'long': return `${faker.company.name()} #${faker.number.int(99999)} — ${faker.location.streetAddress()}`;
    default: return '';
  }
}

function randomNotes(): string {
  const style = faker.helpers.weightedArrayElement([
    { value: 'empty', weight: 70 },
    { value: 'short', weight: 15 },
    { value: 'long', weight: 15 },
  ]);

  switch (style) {
    case 'empty': return '';
    case 'short': return faker.lorem.sentence();
    case 'long': return faker.lorem.paragraphs(2, '\n');
    default: return '';
  }
}

function randomAmount(type: TransactionType): number {
  const tier = faker.helpers.weightedArrayElement([
    { value: 'tiny', weight: 10 },
    { value: 'small', weight: 25 },
    { value: 'normal', weight: 45 },
    { value: 'large', weight: 15 },
    { value: 'huge', weight: 5 },
  ]);

  let cents: number;
  switch (tier) {
    case 'tiny': cents = faker.number.int({ min: 1, max: 99 }); break;
    case 'small': cents = faker.number.int({ min: 100, max: 2500 }); break;
    case 'normal': cents = faker.number.int({ min: 2500, max: 25000 }); break;
    case 'large': cents = faker.number.int({ min: 25000, max: 250000 }); break;
    case 'huge': cents = faker.number.int({ min: 250000, max: 9999999 }); break;
    default: cents = 5000;
  }

  return type === 'income' ? cents : -cents;
}

const ACCOUNT_TYPES: AccountType[] = ['checking', 'savings', 'credit_card', 'cash', 'loan', 'asset'];
const INSTITUTIONS = ['Chase', 'Bank of America', 'Wells Fargo', 'Citi', 'Capital One', 'Ally', 'Vanguard', 'Fidelity', 'Local Credit Union', ''];

/**
 * Generate random accounts using the DataStore mutation interface.
 */
export function generateAccounts(
  mutations: Pick<DataStoreMutations, 'createAccount'>,
  count: number,
): void {
  for (let i = 0; i < count; i++) {
    const type = faker.helpers.arrayElement(ACCOUNT_TYPES);
    const balance = type === 'credit_card' || type === 'loan'
      ? -faker.number.int({ min: 50000, max: 2000000 })
      : faker.number.int({ min: 0, max: 5000000 });
    mutations.createAccount({
      name: `${faker.word.adjective()} ${type.replace('_', ' ')}`,
      type,
      institution: faker.helpers.arrayElement(INSTITUTIONS),
      startingBalance: balance,
    });
  }
}

/**
 * Generate random transactions using the DataStore mutation interface.
 * Each record is schema-validated through createTransaction/createTransfer.
 */
export function generateTransactions(
  mutations: Pick<DataStoreMutations, 'createTransaction' | 'createTransfer'>,
  state: DataStore,
  count: number,
): void {
  const accountIds = state.accounts.map((a) => a.id);
  const categoryIds = state.categories.filter((c) => !c.archived).map((c) => c.id);

  if (accountIds.length === 0) return;

  for (let i = 0; i < count; i++) {
    const type: TransactionType = faker.helpers.weightedArrayElement([
      { value: 'expense' as const, weight: 60 },
      { value: 'income' as const, weight: 30 },
      { value: 'transfer' as const, weight: 10 },
    ]);

    if (type === 'transfer' && accountIds.length >= 2) {
      const [from, to] = faker.helpers.arrayElements(accountIds, 2);
      const amount = faker.number.int({ min: 100, max: 500000 });
      mutations.createTransfer(from, to, amount, randomDate(), {
        description: randomDescription(),
        payee: randomPayee(),
        notes: randomNotes(),
      });
      continue;
    }

    const accountId = faker.helpers.arrayElement(accountIds);
    const effectiveType = type === 'transfer' ? 'expense' : type;
    const uncategorized = faker.datatype.boolean({ probability: 0.1 });

    mutations.createTransaction({
      type: effectiveType,
      accountId,
      date: randomDate(),
      categoryId: uncategorized ? '' : faker.helpers.arrayElement(categoryIds),
      description: randomDescription(),
      payee: randomPayee(),
      amount: randomAmount(effectiveType),
      notes: randomNotes(),
    });
  }
}
