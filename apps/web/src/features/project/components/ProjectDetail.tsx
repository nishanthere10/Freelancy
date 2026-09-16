"use client";

import { listScopeAnalyses } from "@api/ai";
import { DriftAnalysisModal } from "@features/ai";
import {
  Archive,
  ArrowClockwise,
  ArrowLeft,
  CalendarBlank,
  Check,
  Clock,
  CurrencyDollar,
  FileText,
  Lightbulb,
  PencilSimple,
  Sparkle,
  Tag,
  UserCheck,
  X,
} from "@phosphor-icons/react";
import { Button, Card } from "@shared/components";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { toast } from "sonner";
import type { ProjectResponse } from "../api";
import {
  useDeleteProject,
  useProjectDeliverables,
  useRestoreProject,
} from "../hooks";
import { ChangeOrderProposalModal } from "./ChangeOrderProposalModal";
import { ProjectChangeOrdersCard } from "./ProjectChangeOrdersCard";
import { ProjectDeliverablesCard } from "./ProjectDeliverablesCard";
import { ProjectFinancialsCard } from "./ProjectFinancialsCard";
import { ProjectProgressBar } from "./ProjectProgressBar";
import { ProjectStatusControl } from "./ProjectStatusControl";

interface ProjectDetailProps {
  workspaceId: string;
  project: ProjectResponse;
  onBack: () => void;
  onEdit: (project: ProjectResponse) => void;
}

export function ProjectDetail({
  workspaceId,
  project,
  onBack,
  onEdit,
}: ProjectDetailProps) {
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [isDriftModalOpen, setIsDriftModalOpen] = useState(false);
  const [changeOrderProposal, setChangeOrderProposal] = useState<{
    isOpen: boolean;
    driftAnalysisId?: string | null;
    title?: string;
    description?: string;
    additionalBudget?: string;
    additionalHours?: number;
    timelineDeltaDays?: number;
    deliverables?: Array<{ title: string; estimatedHours: number }>;
  }>({ isOpen: false });

  const { mutate: deleteProject, isPending: isDeleting } =
    useDeleteProject(workspaceId);
  const { mutate: restoreProject, isPending: isRestoring } =
    useRestoreProject(workspaceId);

  // Load operational deliverables and progress
  const { data: deliverablesData } = useProjectDeliverables(
    workspaceId,
    project.id,
  );

  // Fetch linked scope analysis for in-context Scope Drift
  const { data: scopes = [] } = useQuery({
    queryKey: ["project-scope", workspaceId, project.id],
    queryFn: () => listScopeAnalyses(workspaceId, { projectId: project.id }),
    enabled: Boolean(workspaceId && project.id),
    staleTime: 1000 * 60 * 5,
  });

  const linkedScope = scopes.find((s) => s.projectId === project.id) || null;
  const isArchived =
    project.status === "archived" || Boolean(project.deletedAt);

  const deliverables = deliverablesData?.deliverables || [];
  const progress = deliverablesData?.progress || {
    totalCount: 0,
    completedCount: 0,
    inProgressCount: 0,
    pendingCount: 0,
    completionPercentage: 0,
    totalEstimatedHours: 0,
    totalLoggedHours: 0,
    remainingHours: 0,
  };

  const handleConfirmArchive = () => {
    deleteProject(project.id, {
      onSuccess: () => {
        setConfirmingArchive(false);
        onBack();
      },
      onSettled: () => setConfirmingArchive(false),
    });
  };

  const handleRestore = () => {
    restoreProject(project.id);
  };

  const handleOpenDrift = () => {
    if (!linkedScope) {
      toast.error(
        "No confirmed AI scope linked to this project. Scope Drift requires an agreed baseline.",
      );
      return;
    }
    setIsDriftModalOpen(true);
  };

  const formattedBudget = project.budgetAmount
    ? `${project.budgetCurrency || "USD"} ${Number(project.budgetAmount).toLocaleString()}`
    : "Not specified";

  return (
    <div className="space-y-6 max-w-[1240px] w-full mx-auto pb-12">
      {/* Top Header Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center text-sm font-medium text-[var(--color-slate-text)] hover:text-[var(--color-ink-deep)] transition-colors gap-2 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Projects</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* In-Context Scope Drift Launcher */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenDrift}
            className="rounded-full text-xs font-bold gap-1.5 bg-gradient-to-r from-[var(--color-yellow-light)] to-[var(--color-surface-soft)] border border-[var(--color-brand-yellow)]/40 hover:border-[var(--color-brand-yellow)] text-[var(--color-ink-deep)] shadow-xs"
          >
            <Sparkle
              className="h-3.5 w-3.5 text-[var(--color-yellow-dark)] animate-pulse"
              weight="fill"
            />
            <span>Check Scope Drift</span>
          </Button>

          {!isArchived ? (
            confirmingArchive ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-[var(--color-error)] mr-1">
                  Archive?
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleConfirmArchive}
                  disabled={isDeleting}
                  className="h-8 px-3 text-xs bg-[var(--color-error)] text-white hover:opacity-90 border-none rounded-full"
                >
                  <Check className="h-3.5 w-3.5 mr-1" /> Yes
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmingArchive(false)}
                  disabled={isDeleting}
                  className="h-8 px-3 text-xs rounded-full"
                >
                  <X className="h-3.5 w-3.5 mr-1" /> No
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEdit(project)}
                  className="rounded-full text-xs font-semibold"
                >
                  <PencilSimple className="h-3.5 w-3.5 mr-1.5" /> Edit Project
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmingArchive(true)}
                  disabled={isDeleting}
                  className="text-[var(--color-error)] hover:text-white hover:bg-[var(--color-error)] rounded-full text-xs font-semibold"
                >
                  <Archive className="h-3.5 w-3.5 mr-1.5" /> Archive
                </Button>
              </>
            )
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRestore}
              disabled={isRestoring}
              className="rounded-full text-xs font-semibold"
            >
              <ArrowClockwise className="h-3.5 w-3.5 mr-1.5" /> Restore Project
            </Button>
          )}
        </div>
      </div>

      {/* Main Project Overview Header Card */}
      <Card className="p-6 sm:p-8 rounded-[var(--radius-xl)] border border-[var(--color-hairline-soft)] border-t-[3px] border-t-[var(--color-brand-yellow)] bg-white shadow-[var(--shadow-card)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--color-hairline-soft)]">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-ink-deep)] tracking-tight">
                {project.name}
              </h1>
              <ProjectStatusControl
                workspaceId={workspaceId}
                projectId={project.id}
                currentStatus={project.status}
              />
            </div>

            <p className="text-sm font-medium text-[var(--color-slate-text)] flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-[var(--color-ink-deep)] font-semibold">
                <UserCheck className="h-4 w-4 text-[var(--color-yellow-dark)]" />
                <span>
                  {project.clientName ? project.clientName : "Internal Project"}
                </span>
              </span>
              <span className="text-[var(--color-stone)]">•</span>
              <span className="capitalize text-[var(--color-charcoal)] flex items-center gap-1">
                <Tag className="h-3.5 w-3.5 text-[var(--color-stone)]" />
                {project.pricingModel} pricing
              </span>
              {linkedScope && (
                <>
                  <span className="text-[var(--color-stone)]">•</span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--color-brand-teal)] bg-[var(--color-teal-light)] px-2.5 py-0.5 rounded-full border border-[var(--color-brand-teal)]/20">
                    <Sparkle className="h-3 w-3" /> AI Confirmed Scope
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-[var(--radius-xl)] bg-[var(--color-teal-light)]/40 border border-[var(--color-brand-teal)]/20 space-y-1.5">
            <div className="flex items-center gap-2 text-[var(--color-moss-dark)] text-xs font-bold uppercase tracking-wider">
              <div className="p-1.5 rounded-[var(--radius-md)] bg-white text-[var(--color-brand-teal)] shadow-xs">
                <CurrencyDollar className="h-4 w-4" />
              </div>
              <span>Agreed Budget</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-ink-deep)] pt-1">
              {formattedBudget}
            </div>
            <div className="text-xs text-[var(--color-charcoal)] capitalize">
              Billing model: {project.pricingModel}
            </div>
          </div>

          <div className="p-5 rounded-[var(--radius-xl)] bg-[var(--color-surface-pricing-featured)] border border-[var(--color-brand-blue)]/20 space-y-1.5">
            <div className="flex items-center gap-2 text-[var(--color-brand-blue)] text-xs font-bold uppercase tracking-wider">
              <div className="p-1.5 rounded-[var(--radius-md)] bg-white text-[var(--color-brand-blue)] shadow-xs">
                <CalendarBlank className="h-4 w-4" />
              </div>
              <span>Target Delivery</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-ink-deep)] pt-1">
              {project.targetDate || "Not set"}
            </div>
            <div className="text-xs text-[var(--color-charcoal)]">
              Start date: {project.startDate || "Not specified"}
            </div>
          </div>

          <div className="p-5 rounded-[var(--radius-xl)] bg-[var(--color-yellow-light)] border border-[var(--color-brand-yellow)]/30 space-y-1.5">
            <div className="flex items-center gap-2 text-[var(--color-yellow-dark)] text-xs font-bold uppercase tracking-wider">
              <div className="p-1.5 rounded-[var(--radius-md)] bg-white text-[var(--color-yellow-dark)] shadow-xs">
                <Clock className="h-4 w-4" />
              </div>
              <span>Hours Tracked</span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-ink-deep)] pt-1">
              {progress.totalLoggedHours}h{" "}
              <span className="text-xs font-normal text-[var(--color-slate-text)]">
                / {progress.totalEstimatedHours}h est.
              </span>
            </div>
            <div className="text-xs text-[var(--color-charcoal)]">
              {progress.remainingHours}h remaining to budget
            </div>
          </div>
        </div>

        {/* Scope Description */}
        {project.description && (
          <div className="space-y-2 pt-4 border-t border-[var(--color-hairline-soft)] text-xs">
            <h4 className="font-bold text-[var(--color-ink-deep)] flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-[var(--color-yellow-dark)]" />{" "}
              Project Scope Overview
            </h4>
            <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface-soft)] border border-[var(--color-hairline)] text-[var(--color-charcoal)] leading-relaxed whitespace-pre-wrap">
              {project.description}
            </div>
          </div>
        )}
      </Card>

      {/* Layer 1: Deterministic Progress Tracking */}
      <ProjectProgressBar progress={progress} />

      {/* Layer 2: Deliverables Execution Engine */}
      <ProjectDeliverablesCard
        workspaceId={workspaceId}
        projectId={project.id}
        deliverables={deliverables}
        hasLinkedScope={Boolean(linkedScope)}
      />

      {/* Layer 3: Financial Engine & Progress Invoicing */}
      <ProjectFinancialsCard
        workspaceId={workspaceId}
        projectId={project.id}
        budgetAmount={project.budgetAmount}
        budgetCurrency={project.budgetCurrency}
        deliverables={deliverables}
      />

      {/* Layer 4: Scope Drift → Change Order Bridge */}
      <ProjectChangeOrdersCard
        workspaceId={workspaceId}
        projectId={project.id}
        scopeAnalysisId={linkedScope?.id}
        projectBudget={project.budgetAmount}
        projectCurrency={project.budgetCurrency}
        projectTargetDate={project.targetDate}
      />

      {/* Layer 5: AI Scope Intelligence Context */}
      {linkedScope && (
        <Card className="p-6 rounded-[var(--radius-xl)] bg-gradient-to-br from-white to-[var(--color-surface-yellow)]/30 border border-[var(--color-brand-yellow)]/30 shadow-[var(--shadow-card)] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[var(--color-yellow-light)] text-[var(--color-yellow-dark)]">
                <Lightbulb className="h-4 w-4" weight="bold" />
              </div>
              <h3 className="text-sm font-bold text-[var(--color-ink-deep)]">
                AI Scope Baseline & Drift Protection
              </h3>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleOpenDrift}
              className="rounded-full text-xs font-bold gap-1 border-[var(--color-brand-yellow)] hover:bg-[var(--color-yellow-light)] text-[var(--color-ink-deep)]"
            >
              <Sparkle className="h-3.5 w-3.5 text-[var(--color-yellow-dark)]" />
              <span>Analyze Change Request</span>
            </Button>
          </div>

          <p className="text-xs text-[var(--color-slate-text)] leading-relaxed">
            This project is protected by an immutable confirmed AI scope
            baseline. If your client requests unexpected features or timeline
            shifts mid-delivery, use{" "}
            <strong className="text-[var(--color-ink-deep)]">
              &quot;Check Scope Drift&quot;
            </strong>{" "}
            to evaluate budget, timeline, and risk impact before doing unpaid
            work.
          </p>
        </Card>
      )}

      {/* Embedded In-Context Scope Drift Modal */}
      {linkedScope && (
        <DriftAnalysisModal
          isOpen={isDriftModalOpen}
          onClose={() => setIsDriftModalOpen(false)}
          workspaceId={workspaceId}
          scopeAnalysisId={linkedScope.id}
          scopeTitle={project.name}
          onConvertToChangeOrder={(draft) => {
            setChangeOrderProposal({
              isOpen: true,
              driftAnalysisId: draft.driftAnalysisId,
              title: draft.title,
              description: draft.description,
              additionalBudget: draft.additionalBudget,
              additionalHours: draft.additionalHours,
              timelineDeltaDays: draft.timelineDeltaDays,
              deliverables: draft.deliverables,
            });
          }}
        />
      )}

      {/* Change Order Proposal Modal from Drift Conversion */}
      {linkedScope && changeOrderProposal.isOpen && (
        <ChangeOrderProposalModal
          isOpen={changeOrderProposal.isOpen}
          onClose={() => setChangeOrderProposal({ isOpen: false })}
          workspaceId={workspaceId}
          projectId={project.id}
          scopeAnalysisId={linkedScope.id}
          driftAnalysisId={changeOrderProposal.driftAnalysisId}
          projectBudget={project.budgetAmount}
          projectCurrency={project.budgetCurrency}
          projectTargetDate={project.targetDate}
          initialTitle={changeOrderProposal.title}
          initialDescription={changeOrderProposal.description}
          initialAdditionalBudget={changeOrderProposal.additionalBudget}
          initialAdditionalHours={changeOrderProposal.additionalHours}
          initialTimelineDeltaDays={changeOrderProposal.timelineDeltaDays}
          initialDeliverables={changeOrderProposal.deliverables}
        />
      )}
    </div>
  );
}
