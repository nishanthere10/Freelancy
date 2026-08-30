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
      case 'active':
        return 'bg-[var(--color-teal-light)] text-[var(--color-moss-dark)] border-[var(--color-brand-teal)]/30';
      case 'completed':
        return 'bg-[var(--color-surface-pricing-featured)] text-[var(--color-brand-blue)] border-[var(--color-brand-blue)]/20';
      case 'on_hold':
        return 'bg-[var(--color-yellow-light)] text-[var(--color-yellow-dark)] border-[var(--color-brand-yellow)]/40';
      case 'archived':
      case 'cancelled':
      default:
        return 'bg-[var(--color-surface-soft)] text-[var(--color-steel)] border-[var(--color-hairline-strong)]';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center text-sm font-medium text-[var(--color-slate-text)] hover:text-[var(--color-ink-deep)] transition-colors gap-2 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Clients</span>
        </button>

        <Button onClick={() => onEdit(client)} size="sm" className="rounded-full">
          <PencilSimple className="h-4 w-4 mr-1.5" /> Edit Client
        </Button>
      </div>

      {/* Main Client Profile Card */}
      <div className="bg-white rounded-[var(--radius-xl)] p-6 sm:p-8 border border-[var(--color-hairline-soft)] border-t-[3px] border-t-[var(--color-brand-teal)] shadow-[var(--shadow-card)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-[var(--radius-lg)] bg-[var(--color-teal-light)] text-[var(--color-moss-dark)] border border-[var(--color-brand-teal)]/20 flex items-center justify-center font-bold text-xl shadow-xs">
              {client.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-ink-deep)] tracking-tight">
                {client.name}
              </h1>
              {client.companyName && (
                <p className="text-sm text-[var(--color-slate-text)] flex items-center gap-1.5 mt-0.5 font-medium">
                  <Buildings className="h-4 w-4 text-[var(--color-brand-teal)]" /> {client.companyName}
                </p>
              )}
            </div>
          </div>

          <span
            className={`self-start sm:self-center px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${
              client.status === 'active'
                ? 'bg-[var(--color-teal-light)] text-[var(--color-moss-dark)] border-[var(--color-brand-teal)]/30'
                : client.status === 'inactive'
                ? 'bg-[var(--color-yellow-light)] text-[var(--color-yellow-dark)] border-[var(--color-brand-yellow)]/40'
                : 'bg-[var(--color-surface-soft)] text-[var(--color-steel)] border-[var(--color-hairline-strong)]'
            }`}
          >
            {client.status}
          </span>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[var(--color-hairline-soft)]">
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[var(--color-steel)] uppercase tracking-wider">
              Contact Information
            </h3>
            <div className="text-sm space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-soft)] text-[var(--color-stone)]">
                  <EnvelopeSimple className="h-4 w-4" />
                </div>
                <a
                  href={`mailto:${client.email}`}
                  className="text-[var(--color-brand-teal)] hover:underline font-medium transition-colors"
                >
                  {client.email}
                </a>
              </div>
              {client.phone && (
                <div className="flex items-center gap-2.5 text-[var(--color-charcoal)]">
                  <div className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-soft)] text-[var(--color-stone)]">
                    <Phone className="h-4 w-4" />
                  </div>
                  <span>{client.phone}</span>
                </div>
              )}
              {client.website && (
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-soft)] text-[var(--color-stone)]">
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
                    className="text-[var(--color-brand-teal)] hover:underline font-medium transition-colors"
                  >
                    {client.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[var(--color-steel)] uppercase tracking-wider">
              Business & Billing Details
            </h3>
            <div className="text-sm space-y-2.5">
              {client.contactPerson && (
                <div>
                  <span className="text-xs text-[var(--color-steel)] block font-medium">Primary Contact</span>
                  <span className="font-semibold text-[var(--color-charcoal)]">
                    {client.contactPerson} {client.department ? `(${client.department})` : ''}
                  </span>
                </div>
              )}
              {client.gstNumber && (
                <div>
                  <span className="text-xs text-[var(--color-steel)] block font-medium">GST / Tax Number</span>
                  <span className="font-mono text-sm font-semibold text-[var(--color-ink-deep)]">
                    {client.gstNumber}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Address Section */}
        {(client.address || client.city || client.state) && (
          <div className="pt-6 border-t border-[var(--color-hairline-soft)]">
            <h3 className="text-xs font-bold text-[var(--color-steel)] uppercase tracking-wider mb-2.5">
              Billing Address
            </h3>
            <div className="flex items-start gap-2.5 text-sm text-[var(--color-charcoal)]">
              <div className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-soft)] text-[var(--color-stone)] mt-0.5">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                {client.address && <div className="font-medium">{client.address}</div>}
                <div className="text-[var(--color-steel)]">
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
      <div className="section-card space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[var(--radius-lg)] bg-[var(--color-yellow-light)] text-[var(--color-yellow-dark)]">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--color-ink-deep)]">
                Client Projects
              </h2>
              <p className="text-xs text-[var(--color-slate-text)]">
                Active and historical projects associated with {client.name}
              </p>
            </div>
          </div>

          <Link
            href={`/workspaces/${workspaceId}/projects`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[var(--color-brand-yellow)] hover:bg-[var(--color-brand-yellow-deep)] text-[var(--color-primary)] text-xs font-bold rounded-full transition-all active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Project</span>
          </Link>
        </div>

        {projectsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-28 skeleton-shimmer" />
            <div className="h-28 skeleton-shimmer" />
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="text-center py-10 px-4 border-2 border-dashed border-[var(--color-hairline)] rounded-[var(--radius-xl)] space-y-3 bg-[var(--color-surface-soft)]">
            <div className="mx-auto h-10 w-10 rounded-full bg-[var(--color-surface-pricing-featured)] text-[var(--color-brand-blue)] flex items-center justify-center">
              <FolderSimple className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-ink-deep)]">No projects yet</h4>
              <p className="text-xs text-[var(--color-slate-text)] mt-1 max-w-sm mx-auto">
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
                className="p-5 rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] border-t-[3px] border-t-[var(--color-brand-yellow)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 transition-all group bg-white flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm text-[var(--color-ink-deep)] group-hover:text-[var(--color-brand-blue)] transition-colors">
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
                    <p className="text-xs text-[var(--color-slate-text)] line-clamp-2">
                      {project.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-[var(--color-steel)] pt-2.5 border-t border-[var(--color-hairline-soft)]">
                  {project.budgetAmount !== undefined && project.budgetAmount !== null ? (
                    <div className="flex items-center gap-1 font-semibold text-[var(--color-ink-deep)]">
                      <CurrencyDollar className="h-3.5 w-3.5 text-[var(--color-success-accent)]" />
                      <span>{project.budgetCurrency || 'INR'} {Number(project.budgetAmount).toLocaleString()}</span>
                    </div>
                  ) : (
                    <span className="text-[var(--color-steel)]">No budget set</span>
                  )}

                  {project.targetDate && (
                    <div className="flex items-center gap-1 text-[var(--color-charcoal)]">
                      <Calendar className="h-3.5 w-3.5 text-[var(--color-brand-blue)]" />
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
