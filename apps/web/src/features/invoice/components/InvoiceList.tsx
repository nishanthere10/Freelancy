import type { InvoiceResponse } from '../api';
import { InvoiceCard } from './InvoiceCard';

interface InvoiceListProps {
  invoices: InvoiceResponse[];
  onSelect: (invoice: InvoiceResponse) => void;
}

export function InvoiceList({ invoices, onSelect }: InvoiceListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {invoices.map((invoice) => (
        <InvoiceCard key={invoice.id} invoice={invoice} onSelect={onSelect} />
      ))}
    </div>
  );
}
