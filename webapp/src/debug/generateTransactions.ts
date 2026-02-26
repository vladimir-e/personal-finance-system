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

const SEED_ACCOUNTS: { name: string; type: AccountType; institution: string; balance: number; archived?: boolean }[] = [
  { name: 'Checking',        type: 'checking',    institution: 'Chase',        balance: 245000 },
  { name: 'Savings',         type: 'savings',     institution: 'Chase',        balance: 1820000 },
  { name: 'Emergency Fund',  type: 'savings',     institution: 'Ally',         balance: 750000 },
  { name: 'Cash Wallet',     type: 'cash',        institution: '',             balance: 8500 },
  { name: 'Visa Platinum',   type: 'credit_card', institution: 'Citi',         balance: -185000 },
  { name: 'Travel Rewards',  type: 'credit_card', institution: 'Capital One',  balance: -42000 },
  { name: 'Auto Loan',       type: 'loan',        institution: 'Wells Fargo',  balance: -1450000 },
  { name: 'Student Loan',    type: 'loan',        institution: 'FedLoan',      balance: -2800000 },
  { name: 'Brokerage',       type: 'asset',       institution: 'Vanguard',     balance: 8500000 },
  { name: 'Bitcoin',         type: 'crypto',      institution: 'Coinbase',     balance: 320000 },
  { name: 'Old Savings',     type: 'savings',     institution: 'Local CU',     balance: 0, archived: true },
];

/**
 * Seed a fixed set of accounts covering all account types,
 * including multiple per group and one archived account.
 */
export function seedAccounts(
  mutations: Pick<DataStoreMutations, 'createAccount' | 'createTransaction' | 'archiveAccount'>,
): void {
  for (const seed of SEED_ACCOUNTS) {
    // createAccount always emits an income-type opening balance,
    // which must be >= 0. For debt accounts, create with 0 then
    // add a separate expense transaction for the negative balance.
    const isDebt = seed.balance < 0;
    const account = mutations.createAccount({
      name: seed.name,
      type: seed.type,
      institution: seed.institution,
      startingBalance: isDebt ? 0 : seed.balance,
    });
    if (isDebt) {
      mutations.createTransaction({
        type: 'expense',
        accountId: account.id,
        date: new Date().toISOString().slice(0, 10),
        amount: seed.balance,
        description: 'Opening balance',
      });
    }
    if (seed.archived) {
      mutations.archiveAccount(account.id, true);
    }
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
    const uncategorized = categoryIds.length === 0 || faker.datatype.boolean({ probability: 0.1 });

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
