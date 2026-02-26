import type { DataStore, Account, Transaction, Category, AccountType, TransactionType } from 'pfs-lib';
import { getDefaultCategories } from 'pfs-lib';

// ── Date helpers ────────────────────────────────────────────

function getMonthString(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function dateIn(monthOffset: number, day: number): string {
  const m = getMonthString(monthOffset);
  return `${m}-${String(day).padStart(2, '0')}`;
}

const TIMESTAMP = '2026-01-01T00:00:00.000Z';

// ── Category IDs (match getDefaultCategories output) ────────

const CAT = {
  PAYCHECK: '1',
  OTHER_INCOME: '2',
  HOUSING: '3',
  BILLS: '4',
  SUBSCRIPTIONS: '5',
  GROCERIES: '6',
  DINING: '7',
  TRANSPORT: '8',
  ALCOHOL: '9',
  HEALTH: '10',
  CLOTHING: '11',
  FUN: '12',
  ALLOWANCES: '13',
  EDUCATION: '14',
  GIFTS: '15',
  HOUSEKEEPING: '16',
  BIG_PURCHASES: '17',
  TRAVEL: '18',
  TAXES: '19',
};

// ── Builders ────────────────────────────────────────────────

function makeAccount(
  id: string,
  name: string,
  type: AccountType,
  institution = '',
): Account {
  return { id, name, type, institution, reportedBalance: null, reconciledAt: '', archived: false, createdAt: TIMESTAMP };
}

let txCounter = 0;
function makeTxn(
  prefix: string,
  accountId: string,
  type: TransactionType,
  amount: number,
  date: string,
  categoryId: string,
  description: string,
  payee = '',
  transferPairId = '',
): Transaction {
  return {
    id: `${prefix}-txn-${++txCounter}`,
    type,
    accountId,
    date,
    categoryId,
    description,
    payee,
    transferPairId,
    amount,
    notes: '',
    source: 'manual',
    createdAt: TIMESTAMP,
  };
}

function categoriesWithAssigned(assignments: Record<string, number>): Category[] {
  return getDefaultCategories().map((cat) => ({
    ...cat,
    assigned: assignments[cat.id] ?? 0,
  }));
}

// ── Preset A: Underwater ────────────────────────────────────

export function createUnderwaterPreset(): DataStore {
  txCounter = 0;
  const P = 'uw';

  const checking = makeAccount(`${P}-acct-1`, 'Checking', 'checking', 'Local Credit Union');
  const creditCard = makeAccount(`${P}-acct-2`, 'Credit Card', 'credit_card', 'Big Bank');
  const studentLoan = makeAccount(`${P}-acct-3`, 'Student Loan', 'loan', 'Federal Loans');

  const categories = categoriesWithAssigned({
    [CAT.HOUSING]: 150000,
    [CAT.BILLS]: 25000,
    [CAT.SUBSCRIPTIONS]: 15000,
    [CAT.GROCERIES]: 40000,
    [CAT.DINING]: 25000,
    [CAT.TRANSPORT]: 20000,
    [CAT.ALCOHOL]: 10000,
    [CAT.HEALTH]: 5000,
    [CAT.CLOTHING]: 10000,
    [CAT.FUN]: 15000,
    [CAT.ALLOWANCES]: 5000,
    [CAT.GIFTS]: 5000,
    [CAT.HOUSEKEEPING]: 5000,
    [CAT.TRAVEL]: 10000,
  });
  // Total assigned: $3,400/mo vs $3,200 income → negative available

  const transactions: Transaction[] = [];
  const t = (
    acctId: string, type: TransactionType, amount: number, date: string,
    catId: string, desc: string, payee = '', pairId = '',
  ) => { transactions.push(makeTxn(P, acctId, type, amount, date, catId, desc, payee, pairId)); };

  // -- 2 months ago --
  t(checking.id, 'income', 320000, dateIn(-2, 1), CAT.PAYCHECK, 'Paycheck', 'Employer Inc');
  t(checking.id, 'expense', -140000, dateIn(-2, 3), CAT.HOUSING, 'Rent', 'Landlord');
  t(checking.id, 'expense', -35000, dateIn(-2, 7), CAT.GROCERIES, 'Grocery run', 'Walmart');
  t(checking.id, 'expense', -12000, dateIn(-2, 10), CAT.DINING, 'Dinner out', 'Olive Garden');
  t(checking.id, 'expense', -8500, dateIn(-2, 12), CAT.SUBSCRIPTIONS, 'Streaming + gym', '');
  t(checking.id, 'expense', -15000, dateIn(-2, 15), CAT.TRANSPORT, 'Gas + transit', 'Shell');
  t(checking.id, 'expense', -22000, dateIn(-2, 18), CAT.BILLS, 'Electric + internet', 'Utilities Co');

  // Credit card spending 2 months ago
  t(creditCard.id, 'expense', -45000, dateIn(-2, 5), CAT.CLOTHING, 'New clothes', 'H&M');
  t(creditCard.id, 'expense', -18000, dateIn(-2, 9), CAT.FUN, 'Concert tickets', 'Ticketmaster');
  t(creditCard.id, 'expense', -32000, dateIn(-2, 14), CAT.GROCERIES, 'Bulk shopping', 'Costco');
  t(creditCard.id, 'expense', -25000, dateIn(-2, 20), CAT.DINING, 'Eating out', 'Various');

  // Student loan disbursement
  t(studentLoan.id, 'expense', -4200000, dateIn(-2, 1), '', 'Loan principal', 'Federal Loans');

  // -- Last month --
  t(checking.id, 'income', 320000, dateIn(-1, 1), CAT.PAYCHECK, 'Paycheck', 'Employer Inc');
  t(checking.id, 'expense', -140000, dateIn(-1, 3), CAT.HOUSING, 'Rent', 'Landlord');
  t(checking.id, 'expense', -38000, dateIn(-1, 6), CAT.GROCERIES, 'Groceries', 'Trader Joe\'s');
  t(checking.id, 'expense', -15000, dateIn(-1, 9), CAT.DINING, 'Takeout', 'DoorDash');
  t(checking.id, 'expense', -8500, dateIn(-1, 12), CAT.SUBSCRIPTIONS, 'Subscriptions', '');
  t(checking.id, 'expense', -18000, dateIn(-1, 15), CAT.TRANSPORT, 'Gas + parking', 'Shell');
  t(checking.id, 'expense', -24000, dateIn(-1, 18), CAT.BILLS, 'Bills', 'Utilities Co');
  t(checking.id, 'expense', -10000, dateIn(-1, 22), CAT.ALCOHOL, 'Bar tab', 'The Pub');

  // Credit card last month
  t(creditCard.id, 'expense', -28000, dateIn(-1, 4), CAT.DINING, 'Restaurant week', 'Various');
  t(creditCard.id, 'expense', -15000, dateIn(-1, 11), CAT.FUN, 'Video games', 'Steam');
  t(creditCard.id, 'expense', -42000, dateIn(-1, 16), CAT.GROCERIES, 'Bulk buy', 'Costco');

  // Minimum loan payment (transfer from checking to loan)
  const loanPayOutId = `${P}-txn-lp1-out`;
  const loanPayInId = `${P}-txn-lp1-in`;
  transactions.push({ ...makeTxn(P, checking.id, 'transfer', -35000, dateIn(-1, 25), '', 'Loan payment', '', loanPayInId), id: loanPayOutId });
  transactions.push({ ...makeTxn(P, studentLoan.id, 'transfer', 35000, dateIn(-1, 25), '', 'Loan payment', '', loanPayOutId), id: loanPayInId });

  // -- Current month --
  t(checking.id, 'income', 320000, dateIn(0, 1), CAT.PAYCHECK, 'Paycheck', 'Employer Inc');
  t(checking.id, 'expense', -140000, dateIn(0, 3), CAT.HOUSING, 'Rent', 'Landlord');
  t(checking.id, 'expense', -42000, dateIn(0, 5), CAT.GROCERIES, 'Weekly groceries', 'Kroger');
  t(checking.id, 'expense', -8500, dateIn(0, 8), CAT.SUBSCRIPTIONS, 'Subscriptions', '');
  t(checking.id, 'expense', -20000, dateIn(0, 10), CAT.TRANSPORT, 'Car insurance + gas', 'Geico');
  t(checking.id, 'expense', -24000, dateIn(0, 12), CAT.BILLS, 'Utilities', 'Utilities Co');
  t(checking.id, 'expense', -7500, dateIn(0, 15), CAT.HEALTH, 'Pharmacy', 'CVS');

  // Credit card current month
  t(creditCard.id, 'expense', -22000, dateIn(0, 6), CAT.DINING, 'Lunch meetings', 'Various');
  t(creditCard.id, 'expense', -35000, dateIn(0, 13), CAT.TRAVEL, 'Weekend trip', 'Airbnb');

  return {
    accounts: [checking, creditCard, studentLoan],
    transactions,
    categories,
  };
}

// ── Preset B: Paycheck to Paycheck ──────────────────────────

export function createPaycheckPreset(): DataStore {
  txCounter = 0;
  const P = 'pp';

  const checking = makeAccount(`${P}-acct-1`, 'Checking', 'checking', 'National Bank');
  const savings = makeAccount(`${P}-acct-2`, 'Savings', 'savings', 'National Bank');
  const creditCard = makeAccount(`${P}-acct-3`, 'Credit Card', 'credit_card', 'Chase');

  const categories = categoriesWithAssigned({
    [CAT.HOUSING]: 145000,
    [CAT.BILLS]: 25000,
    [CAT.SUBSCRIPTIONS]: 7000,
    [CAT.GROCERIES]: 55000,
    [CAT.DINING]: 12000,
    [CAT.TRANSPORT]: 35000,
    [CAT.HEALTH]: 8000,
    [CAT.CLOTHING]: 5000,
    [CAT.FUN]: 6000,
    [CAT.HOUSEKEEPING]: 5000,
    [CAT.GIFTS]: 3000,
    [CAT.TAXES]: 15000,
    [CAT.ALLOWANCES]: 5000,
    [CAT.EDUCATION]: 5000,
  });
  // Total assigned: ~$3,310/mo. Income ~$3,800 but credit card debt drags ATB to ~$0

  const transactions: Transaction[] = [];
  const t = (
    acctId: string, type: TransactionType, amount: number, date: string,
    catId: string, desc: string, payee = '', pairId = '',
  ) => { transactions.push(makeTxn(P, acctId, type, amount, date, catId, desc, payee, pairId)); };

  // -- 2 months ago --
  t(checking.id, 'income', 190000, dateIn(-2, 1), CAT.PAYCHECK, 'Paycheck', 'WorkCorp');
  t(checking.id, 'income', 190000, dateIn(-2, 15), CAT.PAYCHECK, 'Paycheck', 'WorkCorp');
  t(checking.id, 'expense', -145000, dateIn(-2, 3), CAT.HOUSING, 'Rent', 'Property Mgmt');
  t(checking.id, 'expense', -52000, dateIn(-2, 7), CAT.GROCERIES, 'Groceries', 'Aldi');
  t(checking.id, 'expense', -25000, dateIn(-2, 10), CAT.BILLS, 'Utilities', 'Power Co');
  t(checking.id, 'expense', -32000, dateIn(-2, 14), CAT.TRANSPORT, 'Bus pass + gas', 'Metro');
  t(checking.id, 'expense', -7000, dateIn(-2, 16), CAT.SUBSCRIPTIONS, 'Spotify + cloud', '');
  t(checking.id, 'expense', -8000, dateIn(-2, 20), CAT.HEALTH, 'Prescription', 'Pharmacy');

  t(creditCard.id, 'expense', -12000, dateIn(-2, 8), CAT.DINING, 'Takeout', 'GrubHub');
  t(creditCard.id, 'expense', -15000, dateIn(-2, 18), CAT.TAXES, 'State taxes', 'State');
  t(creditCard.id, 'expense', -6000, dateIn(-2, 22), CAT.FUN, 'Movie night', 'AMC');

  // Savings deposit
  const savXfer1Out = `${P}-txn-sav1-out`;
  const savXfer1In = `${P}-txn-sav1-in`;
  transactions.push({ ...makeTxn(P, checking.id, 'transfer', -5000, dateIn(-2, 28), '', 'Savings', '', savXfer1In), id: savXfer1Out });
  transactions.push({ ...makeTxn(P, savings.id, 'transfer', 5000, dateIn(-2, 28), '', 'Savings', '', savXfer1Out), id: savXfer1In });

  // -- Last month --
  t(checking.id, 'income', 190000, dateIn(-1, 1), CAT.PAYCHECK, 'Paycheck', 'WorkCorp');
  t(checking.id, 'income', 190000, dateIn(-1, 15), CAT.PAYCHECK, 'Paycheck', 'WorkCorp');
  t(checking.id, 'expense', -145000, dateIn(-1, 3), CAT.HOUSING, 'Rent', 'Property Mgmt');
  t(checking.id, 'expense', -58000, dateIn(-1, 6), CAT.GROCERIES, 'Groceries', 'Aldi');
  t(checking.id, 'expense', -25000, dateIn(-1, 9), CAT.BILLS, 'Utilities', 'Power Co');
  t(checking.id, 'expense', -35000, dateIn(-1, 13), CAT.TRANSPORT, 'Gas + repairs', 'AutoZone');
  t(checking.id, 'expense', -7000, dateIn(-1, 16), CAT.SUBSCRIPTIONS, 'Subscriptions', '');
  t(checking.id, 'expense', -5000, dateIn(-1, 19), CAT.CLOTHING, 'Thrift store', 'Goodwill');
  t(checking.id, 'expense', -15000, dateIn(-1, 24), CAT.TAXES, 'Estimated taxes', 'IRS');

  t(creditCard.id, 'expense', -9500, dateIn(-1, 5), CAT.DINING, 'Pizza', 'Dominos');
  t(creditCard.id, 'expense', -8000, dateIn(-1, 12), CAT.HEALTH, 'Copay', 'Doctor');
  // A few uncategorized transactions
  t(creditCard.id, 'expense', -4500, dateIn(-1, 21), '', 'ATM fee + misc', '');
  t(checking.id, 'expense', -3200, dateIn(-1, 26), '', 'Random charge', 'Unknown');

  // -- Current month --
  t(checking.id, 'income', 190000, dateIn(0, 1), CAT.PAYCHECK, 'Paycheck', 'WorkCorp');
  t(checking.id, 'income', 190000, dateIn(0, 15), CAT.PAYCHECK, 'Paycheck', 'WorkCorp');
  t(checking.id, 'expense', -145000, dateIn(0, 3), CAT.HOUSING, 'Rent', 'Property Mgmt');
  t(checking.id, 'expense', -48000, dateIn(0, 7), CAT.GROCERIES, 'Groceries', 'Aldi');
  t(checking.id, 'expense', -25000, dateIn(0, 10), CAT.BILLS, 'Utilities', 'Power Co');
  t(checking.id, 'expense', -7000, dateIn(0, 12), CAT.SUBSCRIPTIONS, 'Subscriptions', '');
  t(checking.id, 'expense', -32000, dateIn(0, 14), CAT.TRANSPORT, 'Bus pass + gas', 'Metro');

  t(creditCard.id, 'expense', -11000, dateIn(0, 6), CAT.DINING, 'Takeout', 'Various');
  t(creditCard.id, 'expense', -5000, dateIn(0, 11), CAT.FUN, 'Bowling', 'Lucky Strike');

  return {
    accounts: [checking, savings, creditCard],
    transactions,
    categories,
  };
}

// ── Preset C: Affluent ──────────────────────────────────────

export function createAffluentPreset(): DataStore {
  txCounter = 0;
  const P = 'af';

  const checking = makeAccount(`${P}-acct-1`, 'Checking', 'checking', 'Premium Bank');
  const savings = makeAccount(`${P}-acct-2`, 'Savings', 'savings', 'Premium Bank');
  const investment = makeAccount(`${P}-acct-3`, 'Investment', 'asset', 'Vanguard');
  const travelCard = makeAccount(`${P}-acct-4`, 'Travel Card', 'credit_card', 'Amex');

  const categories = categoriesWithAssigned({
    [CAT.HOUSING]: 300000,
    [CAT.BILLS]: 30000,
    [CAT.SUBSCRIPTIONS]: 20000,
    [CAT.GROCERIES]: 80000,
    [CAT.DINING]: 60000,
    [CAT.TRANSPORT]: 40000,
    [CAT.ALCOHOL]: 15000,
    [CAT.HEALTH]: 20000,
    [CAT.CLOTHING]: 30000,
    [CAT.FUN]: 40000,
    [CAT.ALLOWANCES]: 20000,
    [CAT.EDUCATION]: 15000,
    [CAT.GIFTS]: 25000,
    [CAT.HOUSEKEEPING]: 15000,
    [CAT.BIG_PURCHASES]: 30000,
    [CAT.TRAVEL]: 50000,
    [CAT.TAXES]: 20000,
  });
  // Total assigned: ~$8,100/mo vs $12,000 income → large surplus

  const transactions: Transaction[] = [];
  const t = (
    acctId: string, type: TransactionType, amount: number, date: string,
    catId: string, desc: string, payee = '', pairId = '',
  ) => { transactions.push(makeTxn(P, acctId, type, amount, date, catId, desc, payee, pairId)); };

  // Investment base value — single large income representing portfolio value
  t(investment.id, 'income', 32000000, dateIn(-2, 1), CAT.OTHER_INCOME, 'Portfolio value', 'Vanguard');

  // Savings base
  t(savings.id, 'income', 8200000, dateIn(-2, 1), CAT.OTHER_INCOME, 'Existing savings', 'Premium Bank');

  // -- 2 months ago --
  t(checking.id, 'income', 850000, dateIn(-2, 1), CAT.PAYCHECK, 'Salary', 'TechCorp');
  t(checking.id, 'income', 350000, dateIn(-2, 5), CAT.OTHER_INCOME, 'Consulting', 'Client LLC');
  t(checking.id, 'expense', -280000, dateIn(-2, 3), CAT.HOUSING, 'Mortgage', 'Bank');
  t(checking.id, 'expense', -65000, dateIn(-2, 7), CAT.GROCERIES, 'Whole Foods', 'Whole Foods');
  t(checking.id, 'expense', -45000, dateIn(-2, 9), CAT.DINING, 'Nice dinner', 'Le Bistro');
  t(checking.id, 'expense', -28000, dateIn(-2, 11), CAT.BILLS, 'Utilities', 'Utilities Co');
  t(checking.id, 'expense', -18000, dateIn(-2, 13), CAT.SUBSCRIPTIONS, 'Subscriptions', '');
  t(checking.id, 'expense', -35000, dateIn(-2, 16), CAT.TRANSPORT, 'Car payment', 'AutoLoan');
  t(checking.id, 'expense', -25000, dateIn(-2, 19), CAT.GIFTS, 'Birthday gift', 'Nordstrom');
  t(checking.id, 'expense', -15000, dateIn(-2, 22), CAT.FUN, 'Golf club', 'Country Club');
  t(checking.id, 'expense', -12000, dateIn(-2, 25), CAT.HEALTH, 'Gym + vitamins', 'Equinox');

  t(travelCard.id, 'expense', -35000, dateIn(-2, 8), CAT.TRAVEL, 'Flights', 'United');
  t(travelCard.id, 'expense', -18000, dateIn(-2, 15), CAT.DINING, 'Business lunch', 'Steakhouse');

  // Savings transfer
  const sav1Out = `${P}-txn-sav1-out`;
  const sav1In = `${P}-txn-sav1-in`;
  transactions.push({ ...makeTxn(P, checking.id, 'transfer', -200000, dateIn(-2, 28), '', 'Monthly savings', '', sav1In), id: sav1Out });
  transactions.push({ ...makeTxn(P, savings.id, 'transfer', 200000, dateIn(-2, 28), '', 'Monthly savings', '', sav1Out), id: sav1In });

  // -- Last month --
  t(checking.id, 'income', 850000, dateIn(-1, 1), CAT.PAYCHECK, 'Salary', 'TechCorp');
  t(checking.id, 'income', 350000, dateIn(-1, 5), CAT.OTHER_INCOME, 'Consulting', 'Client LLC');
  t(checking.id, 'expense', -280000, dateIn(-1, 3), CAT.HOUSING, 'Mortgage', 'Bank');
  t(checking.id, 'expense', -72000, dateIn(-1, 6), CAT.GROCERIES, 'Groceries', 'Whole Foods');
  t(checking.id, 'expense', -55000, dateIn(-1, 8), CAT.DINING, 'Anniversary dinner', 'French Laundry');
  t(checking.id, 'expense', -28000, dateIn(-1, 11), CAT.BILLS, 'Utilities', 'Utilities Co');
  t(checking.id, 'expense', -18000, dateIn(-1, 13), CAT.SUBSCRIPTIONS, 'Subscriptions', '');
  t(checking.id, 'expense', -35000, dateIn(-1, 16), CAT.TRANSPORT, 'Car payment', 'AutoLoan');
  t(checking.id, 'expense', -40000, dateIn(-1, 18), CAT.CLOTHING, 'New suit', 'Brooks Brothers');
  t(checking.id, 'expense', -15000, dateIn(-1, 20), CAT.FUN, 'Concert', 'Ticketmaster');
  t(checking.id, 'expense', -20000, dateIn(-1, 23), CAT.TAXES, 'Estimated tax', 'IRS');
  t(checking.id, 'expense', -30000, dateIn(-1, 26), CAT.BIG_PURCHASES, 'New monitor', 'Apple');

  t(travelCard.id, 'expense', -42000, dateIn(-1, 10), CAT.TRAVEL, 'Hotel', 'Marriott');
  t(travelCard.id, 'expense', -12000, dateIn(-1, 17), CAT.DINING, 'Team dinner', 'Nobu');

  // Savings transfer
  const sav2Out = `${P}-txn-sav2-out`;
  const sav2In = `${P}-txn-sav2-in`;
  transactions.push({ ...makeTxn(P, checking.id, 'transfer', -200000, dateIn(-1, 28), '', 'Monthly savings', '', sav2In), id: sav2Out });
  transactions.push({ ...makeTxn(P, savings.id, 'transfer', 200000, dateIn(-1, 28), '', 'Monthly savings', '', sav2Out), id: sav2In });

  // -- Current month --
  t(checking.id, 'income', 850000, dateIn(0, 1), CAT.PAYCHECK, 'Salary', 'TechCorp');
  t(checking.id, 'income', 350000, dateIn(0, 5), CAT.OTHER_INCOME, 'Consulting', 'Client LLC');
  t(checking.id, 'expense', -280000, dateIn(0, 3), CAT.HOUSING, 'Mortgage', 'Bank');
  t(checking.id, 'expense', -68000, dateIn(0, 7), CAT.GROCERIES, 'Groceries', 'Whole Foods');
  t(checking.id, 'expense', -38000, dateIn(0, 9), CAT.DINING, 'Sushi', 'Omakase');
  t(checking.id, 'expense', -28000, dateIn(0, 11), CAT.BILLS, 'Utilities', 'Utilities Co');
  t(checking.id, 'expense', -18000, dateIn(0, 13), CAT.SUBSCRIPTIONS, 'Subscriptions', '');
  t(checking.id, 'expense', -35000, dateIn(0, 15), CAT.TRANSPORT, 'Car payment', 'AutoLoan');
  t(checking.id, 'expense', -15000, dateIn(0, 18), CAT.ALCOHOL, 'Wine delivery', 'Wine.com');
  t(checking.id, 'expense', -12000, dateIn(0, 20), CAT.HEALTH, 'Gym', 'Equinox');

  t(travelCard.id, 'expense', -22000, dateIn(0, 4), CAT.TRAVEL, 'Lounge access + upgrade', 'United');
  t(travelCard.id, 'expense', -16000, dateIn(0, 12), CAT.DINING, 'Client dinner', 'Capital Grille');

  return {
    accounts: [checking, savings, investment, travelCard],
    transactions,
    categories,
  };
}
