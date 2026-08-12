'use client';

import Link from 'next/link';
import { Button } from '@shared/components';
import {
  ArrowLeft,
  EnvelopeSimple,
  Phone,
  Globe,
  MapPin,
  Buildings,
  PencilSimple,
  Briefcase,
  Plus,
  FolderSimple,
  Calendar,
  CurrencyDollar,
} from '@phosphor-icons/react';
import type { ClientResponse } from '../api';
import { useProjects } from '@features/project/hooks/useProjects';

interface ClientDetailProps {
  workspaceId: string;
  client: ClientResponse;
  onBack: () => void;
  onEdit: (client: ClientResponse) => void;
}

export function ClientDetail({
  workspaceId,
  client,
  onBack,
  onEdit,
}: ClientDetailProps) {
  const { data: projects, isLoading: projectsLoading } = useProjects(workspaceId, {
    clientId: client.id,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'on_hold':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-black transition-colors gap-2 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Clients</span>
        </button>

        <Button onClick={() => onEdit(client)} size="sm">
          <PencilSimple className="h-4 w-4 mr-1.5" /> Edit Client
        </Button>
      </div>

      {/* Main Client Profile Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[var(--color-hairline,#e2e8f0)] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold text-xl shadow-md">
              {client.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-ink-deep,#0f172a)] tracking-tight">
                {client.name}
              </h1>
              {client.companyName && (
                <p className="text-sm text-[var(--color-slate-text,#64748b)] flex items-center gap-1.5 mt-0.5 font-medium">
                  <Buildings className="h-4 w-4 text-amber-600" /> {client.companyName}
                </p>
              )}
            </div>
          </div>

          <span
            className={`self-start sm:self-center px-3 py-1 text-xs font-semibold rounded-full uppercase tracking-wider border ${
              client.status === 'active'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : client.status === 'inactive'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-gray-100 text-gray-600 border-gray-200'
            }`}
          >
            {client.status}
          </span>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Contact Information
            </h3>
            <div className="text-sm space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-gray-50 text-gray-500">
                  <EnvelopeSimple className="h-4 w-4" />
                </div>
                <a
                  href={`mailto:${client.email}`}
                  className="text-amber-600 hover:text-amber-700 font-medium transition-colors"
                >
                  {client.email}
                </a>
              </div>
              {client.phone && (
                <div className="flex items-center gap-2.5 text-gray-700">
                  <div className="p-1.5 rounded-lg bg-gray-50 text-gray-500">
                    <Phone className="h-4 w-4" />
                  </div>
                  <span>{client.phone}</span>
                </div>
              )}
              {client.website && (
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-gray-50 text-gray-500">
                    <Globe className="h-4 w-4" />
                  </div>
                  <a
                    href={
                      client.website.startsWith('http')
                        ? client.website
                        : `https://${client.website}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-600 hover:text-amber-700 font-medium transition-colors"
                  >
                    {client.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Business & Billing Details
            </h3>
            <div className="text-sm space-y-2.5">
              {client.contactPerson && (
                <div>
                  <span className="text-xs text-gray-500 block font-medium">Primary Contact</span>
                  <span className="font-semibold text-gray-800">
                    {client.contactPerson} {client.department ? `(${client.department})` : ''}
                  </span>
                </div>
              )}
              {client.gstNumber && (
                <div>
                  <span className="text-xs text-gray-500 block font-medium">GST / Tax Number</span>
                  <span className="font-mono text-sm font-semibold text-gray-900">
                    {client.gstNumber}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Address Section */}
        {(client.address || client.city || client.state) && (
          <div className="pt-6 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5">
              Billing Address
            </h3>
            <div className="flex items-start gap-2.5 text-sm text-gray-700">
              <div className="p-1.5 rounded-lg bg-gray-50 text-gray-500 mt-0.5">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                {client.address && <div className="font-medium">{client.address}</div>}
                <div className="text-gray-500">
                  {[client.city, client.state, client.postalCode, client.country]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Linked Projects Section */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[var(--color-hairline,#e2e8f0)] shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--color-ink-deep,#0f172a)]">
                Client Projects
              </h2>
              <p className="text-xs text-gray-500">
                Active and historical projects associated with {client.name}
              </p>
            </div>
          </div>

          <Link
            href={`/workspaces/${workspaceId}/projects`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Project</span>
          </Link>
        </div>

        {projectsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-28 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-28 bg-gray-100 rounded-xl animate-pulse" />
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="text-center py-10 px-4 border-2 border-dashed border-gray-200 rounded-2xl space-y-3 bg-gray-50/50">
            <div className="mx-auto h-10 w-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
              <FolderSimple className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-800">No projects yet</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                No projects are linked to {client.name} in this workspace. Create a project to start tracking deliverables.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/workspaces/${workspaceId}/projects`}
                className="p-4 rounded-xl border border-gray-200 hover:border-amber-300 hover:shadow-md transition-all group bg-white flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm text-gray-900 group-hover:text-amber-600 transition-colors">
                      {project.name}
                    </h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 font-bold uppercase rounded-full border ${getStatusBadge(
                        project.status
                      )}`}
                    >
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>

                  {project.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                  {project.budgetAmount !== undefined && project.budgetAmount !== null ? (
                    <div className="flex items-center gap-1 font-semibold text-gray-800">
                      <CurrencyDollar className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{project.budgetCurrency || 'INR'} {Number(project.budgetAmount).toLocaleString()}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">No budget set</span>
                  )}

                  {project.targetDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {new Date(project.targetDate).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
