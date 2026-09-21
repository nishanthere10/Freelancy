"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Zap } from "lucide-react";
import { CreateAutomationSchema, CreateAutomationFormValues } from "../automation.schemas";
import { useClients } from "../../client/hooks/useClients";
import { useProjects } from "../../project/hooks/useProjects";

interface CreateAutomationModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAutomationFormValues) => void;
}

export function CreateAutomationModal({ workspaceId, isOpen, onClose, onSubmit }: CreateAutomationModalProps) {
  const { data: clientsData } = useClients(workspaceId);
  const { data: projectsData } = useProjects(workspaceId);
  const clients = clientsData?.data || [];
  const projects = projectsData?.data || [];

  const [scopeClientId, setScopeClientId] = useState<string>("");
  const [scopeProjectId, setScopeProjectId] = useState<string>("");

  const { register, control, handleSubmit, watch, formState: { errors }, reset } = useForm<CreateAutomationFormValues>({
    resolver: zodResolver(CreateAutomationSchema),
    defaultValues: {
      name: "",
      description: "",
      triggerType: "event",
      triggerConfig: { type: "event", eventType: "invoice_overdue" },
      conditionConfig: { operator: "AND", conditions: [] },
      actionConfig: [{ type: "send_whatsapp", templateKey: "invoice_reminder", recipient: "client" }],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  const { fields: actionFields, append: appendAction, remove: removeAction } = useFieldArray({
    control,
    name: "actionConfig",
  });

  const triggerType = watch("triggerType");

  const onSubmitWrapper = (data: CreateAutomationFormValues) => {
    const finalData = { ...data };
    // Inject scopes as conditions
    if (scopeClientId) {
      finalData.conditionConfig.conditions.push({ field: "clientId", operator: "eq", value: scopeClientId });
    }
    if (scopeProjectId) {
      finalData.conditionConfig.conditions.push({ field: "projectId", operator: "eq", value: scopeProjectId });
    }
    onSubmit(finalData);
    
    // reset form scopes
    setScopeClientId("");
    setScopeProjectId("");
    reset();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between p-6 border-b border-neutral-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#FFD02F] rounded-lg">
                <Zap className="w-5 h-5 text-black" fill="currentColor" />
              </div>
              <h2 className="text-2xl font-medium tracking-tight text-black">Create Automation</h2>
            </div>
            <button onClick={onClose} className="p-2 text-neutral-400 hover:text-black rounded-full hover:bg-neutral-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 font-sans">
            <form id="automation-form" onSubmit={handleSubmit(onSubmitWrapper)} className="space-y-8">
              
              {/* General Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">1. General</h3>
                <div>
                  <label className="block text-sm font-medium text-black mb-1.5">Rule Name</label>
                  <input
                    {...register("name")}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[#FFD02F] focus:border-[#FFD02F] outline-none text-black transition-all"
                    placeholder="e.g. Follow up on overdue invoices"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1.5">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1.5">Description</label>
                  <textarea
                    {...register("description")}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[#FFD02F] focus:border-[#FFD02F] outline-none text-black resize-none transition-all"
                  />
                </div>
              </div>

              {/* Scoping (New Feature) */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">2. Scope (Optional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1.5">Apply to Client</label>
                    <select
                      value={scopeClientId}
                      onChange={(e) => setScopeClientId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[#FFD02F] outline-none text-black transition-all"
                    >
                      <option value="">Any Client</option>
                      {clients.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1.5">Apply to Project</label>
                    <select
                      value={scopeProjectId}
                      onChange={(e) => setScopeProjectId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-[#FFD02F] outline-none text-black transition-all"
                    >
                      <option value="">Any Project</option>
                      {projects.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Trigger Config (Pastel Yellow Sticky Note) */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">3. Trigger</h3>
                
                <div className="p-5 rounded-xl border border-yellow-200 bg-yellow-50/70 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#FFD02F]"></div>
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="radio" value="event" {...register("triggerType")} className="w-4 h-4 text-black focus:ring-black border-neutral-300" />
                      <span className="text-black text-sm font-medium">System Event</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="radio" value="schedule" {...register("triggerType")} className="w-4 h-4 text-black focus:ring-black border-neutral-300" />
                      <span className="text-black text-sm font-medium">Time Schedule</span>
                    </label>
                  </div>

                  {triggerType === "event" ? (
                    <div>
                      <input type="hidden" {...register("triggerConfig.type")} value="event" />
                      <label className="block text-sm font-medium text-black mb-1.5">Event Type</label>
                      <select
                        {...register("triggerConfig.eventType")}
                        className="w-full px-4 py-2.5 bg-white border border-yellow-200 rounded-lg focus:ring-2 focus:ring-[#FFD02F] outline-none text-black shadow-sm"
                      >
                        <option value="invoice_overdue">Invoice Overdue</option>
                        <option value="project_created">Project Created</option>
                        <option value="client_onboarded">Client Onboarded</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <input type="hidden" {...register("triggerConfig.type")} value="schedule" />
                      <div>
                        <label className="block text-sm font-medium text-black mb-1.5">Frequency</label>
                        <select
                          {...register("triggerConfig.frequency")}
                          className="w-full px-4 py-2.5 bg-white border border-yellow-200 rounded-lg focus:ring-2 focus:ring-[#FFD02F] outline-none text-black shadow-sm"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-black mb-1.5">Hour (0-23)</label>
                          <input
                            type="number"
                            {...register("triggerConfig.hour", { valueAsNumber: true })}
                            className="w-full px-4 py-2.5 bg-white border border-yellow-200 rounded-lg focus:ring-2 focus:ring-[#FFD02F] outline-none text-black shadow-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-black mb-1.5">Minute (0-59)</label>
                          <input
                            type="number"
                            {...register("triggerConfig.minute", { valueAsNumber: true })}
                            className="w-full px-4 py-2.5 bg-white border border-yellow-200 rounded-lg focus:ring-2 focus:ring-[#FFD02F] outline-none text-black shadow-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Config (Pastel Rose Sticky Note) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">4. Actions</h3>
                  <button
                    type="button"
                    onClick={() => appendAction({ type: "send_email", templateKey: "follow_up", recipient: "client" })}
                    className="flex items-center space-x-1.5 text-sm text-black hover:bg-neutral-100 px-3 py-1.5 rounded-full font-medium transition-colors border border-transparent hover:border-neutral-200"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Action</span>
                  </button>
                </div>
                
                <div className="space-y-3">
                  {actionFields.map((field, index) => (
                    <div key={field.id} className="p-5 rounded-xl border border-rose-200 bg-rose-50/50 shadow-sm relative overflow-hidden flex items-start space-x-4">
                      <div className="absolute top-0 left-0 w-1 h-full bg-rose-400"></div>
                      <div className="flex-1 space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-black mb-1.5">Action Type</label>
                          <select
                            {...register(`actionConfig.${index}.type` as const)}
                            className="w-full px-3 py-2 bg-white border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-400 outline-none text-black text-sm shadow-sm"
                          >
                            <option value="send_email">Send Email</option>
                            <option value="send_whatsapp">Send WhatsApp</option>
                            <option value="notify_owner">Notify Me</option>
                          </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-black mb-1.5">Template/Message</label>
                            <input
                              {...register(`actionConfig.${index}.templateKey` as const)}
                              placeholder="e.g. invoice_reminder"
                              className="w-full px-3 py-2 bg-white border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-400 outline-none text-black text-sm shadow-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-black mb-1.5">Recipient</label>
                            <select
                              {...register(`actionConfig.${index}.recipient` as const)}
                              className="w-full px-3 py-2 bg-white border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-400 outline-none text-black text-sm shadow-sm"
                            >
                              <option value="client">Client</option>
                              <option value="owner">Me (Owner)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      
                      {actionFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAction(index)}
                          className="p-2 text-rose-400 hover:text-red-600 hover:bg-white rounded-full transition-colors mt-6 shadow-sm border border-transparent hover:border-red-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {errors.actionConfig && <p className="text-red-500 text-xs mt-1">{errors.actionConfig.message}</p>}
              </div>

            </form>
          </div>

          <div className="p-6 border-t border-neutral-100 flex justify-end space-x-3 bg-white">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-black hover:bg-neutral-100 rounded-full transition-colors border border-neutral-200"
            >
              Cancel
            </button>
            <button
              form="automation-form"
              type="submit"
              className="px-6 py-2.5 text-sm font-medium text-white bg-black hover:bg-neutral-800 rounded-full transition-all shadow-md active:scale-95"
            >
              Save Automation
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
