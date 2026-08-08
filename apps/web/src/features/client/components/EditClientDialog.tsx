'use client';

import { Dialog } from '@shared/components';
import { CreateClientForm } from './CreateClientForm';
import { useUpdateClient } from '../hooks';
import type { ClientResponse, UpdateClientInput } from '../api';

interface EditClientDialogProps {
  workspaceId: string;
  client: ClientResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditClientDialog({
  workspaceId,
  client,
  open,
  onOpenChange,
}: EditClientDialogProps) {
  const { mutate: updateClient, isPending } = useUpdateClient(
    workspaceId,
    client?.id || ''
  );

  if (!client) return null;

  const handleSubmit = (data: UpdateClientInput) => {
    updateClient(data, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={`Edit ${client.name}`}>
      <CreateClientForm
        onSubmit={handleSubmit}
        isSubmitting={isPending}
        defaultValues={{
          name: client.name,
          email: client.email,
          phone: client.phone || '',
          website: client.website || '',
          companyName: client.companyName || '',
          gstNumber: client.gstNumber || '',
          contactPerson: client.contactPerson || '',
          department: client.department || '',
          address: client.address || '',
          city: client.city || '',
          state: client.state || '',
          postalCode: client.postalCode || '',
          country: client.country || 'IN',
        }}
        submitLabel="Update Client"
      />
    </Dialog>
  );
}
