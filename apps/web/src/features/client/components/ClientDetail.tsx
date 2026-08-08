'use client';

import { Button } from '@shared/components';
import { ArrowLeft, EnvelopeSimple, Phone, Globe, MapPin, Buildings, PencilSimple } from '@phosphor-icons/react';
import type { ClientResponse } from '../api';

interface ClientDetailProps {
  client: ClientResponse;
  onBack: () => void;
  onEdit: (client: ClientResponse) => void;
}

export function ClientDetail({ client, onBack, onEdit }: ClientDetailProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="secondary" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Clients
        </Button>
        <Button onClick={() => onEdit(client)}>
          <PencilSimple className="h-4 w-4 mr-2" /> Edit Client
        </Button>
      </div>

      <div className="bg-white rounded-xl p-6 border border-[var(--color-hairline)] shadow-sm space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-ink-deep)]">{client.name}</h1>
            {client.companyName && (
              <p className="text-sm text-[var(--color-slate-text)] flex items-center gap-1 mt-1">
                <Buildings className="h-4 w-4" /> {client.companyName}
              </p>
            )}
          </div>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full uppercase tracking-wider">
            {client.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[var(--color-hairline)]">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Info</h3>
            <div className="text-sm space-y-2">
              <div className="flex items-center gap-2">
                <EnvelopeSimple className="h-4 w-4 text-gray-500" />
                <a href={`mailto:${client.email}`} className="text-amber-600 hover:underline">
                  {client.email}
                </a>
              </div>
              {client.phone && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-500" />
                  <a href={client.website} target="_blank" rel="noreferrer" className="text-amber-600 hover:underline">
                    {client.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Business & Tax Details</h3>
            <div className="text-sm space-y-2">
              {client.gstNumber && (
                <div>
                  <span className="text-xs text-gray-500 block">GST Number</span>
                  <span className="font-mono font-medium">{client.gstNumber}</span>
                </div>
              )}
              {client.contactPerson && (
                <div>
                  <span className="text-xs text-gray-500 block">Primary Contact</span>
                  <span>{client.contactPerson} {client.department ? `(${client.department})` : ''}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {(client.address || client.city || client.state) && (
          <div className="pt-4 border-t border-[var(--color-hairline)]">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Address</h3>
            <div className="flex items-start gap-2 text-sm text-gray-700">
              <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
              <div>
                {client.address && <div>{client.address}</div>}
                <div>
                  {[client.city, client.state, client.postalCode, client.country].filter(Boolean).join(', ')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 border border-[var(--color-hairline)] shadow-sm">
        <h2 className="text-lg font-bold text-[var(--color-ink-deep)] mb-4">Projects</h2>
        <div className="text-center py-8 text-sm text-[var(--color-slate-text)] border border-dashed rounded-lg">
          No projects created for this client yet. (Project domain - Sprint 3)
        </div>
      </div>
    </div>
  );
}
