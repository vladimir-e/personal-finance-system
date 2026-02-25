import { BudgetScreen } from '../components/BudgetScreen';
import { CategoryManagement } from '../components/CategoryManagement';

export function BudgetPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-heading">Budget</h1>
      <BudgetScreen />
      <CategoryManagement />
    </div>
  );
}
