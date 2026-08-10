'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles, Plus, MousePointer2, Settings, Users, Layout, Zap, CheckCircle2, MoreHorizontal } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative bg-[var(--color-canvas)] pt-[60px] pb-24 overflow-hidden min-h-[90vh] flex items-center">
      <div className="max-w-[1360px] mx-auto px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Column: Text & CTAs */}
          <div className="text-left">
            {/* Top Tag */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex mb-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[var(--color-surface-pricing-featured)] text-[var(--color-brand-blue)] rounded-[var(--radius-full)] text-[13px] font-bold tracking-tight shadow-sm border border-[var(--color-brand-blue)]/20 hover:scale-105 transition-transform cursor-pointer">
                <Sparkles size={14} className="text-[var(--color-brand-blue)]" />
                New: AI Workflows are here <ArrowRight size={14} className="ml-1" />
              </div>
            </motion.div>

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h1 className="text-[52px] md:text-[68px] lg:text-[76px] font-medium leading-[1.05] tracking-[-2px] text-[var(--color-ink)] mb-6">
                See how freelancers get <span className="text-[var(--color-brand-blue)] relative inline-block whitespace-nowrap">
                  great
                  <svg className="absolute w-full h-3 -bottom-1 left-0 text-[var(--color-brand-yellow)]" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0 5 Q 50 15 100 5" stroke="currentColor" strokeWidth="4" fill="none" />
                  </svg>
                </span> done
              </h1>
              <p className="text-[18px] md:text-[22px] text-[var(--color-charcoal)] font-normal leading-[1.5] max-w-xl mb-10">
                The visual workspace for independent professionals. Manage projects, collaborate with clients, and organize your business in one limitless canvas.
              </p>
            </motion.div>

            {/* CTA Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center gap-4"
            >
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-[var(--radius-full)] text-[16px] font-medium hover:bg-[var(--color-charcoal)] transition-all shadow-[var(--shadow-card)] flex items-center justify-center gap-2 group hover:scale-[1.02]"
              >
                Get started free
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#demo"
                className="w-full sm:w-auto px-8 py-4 bg-[var(--color-canvas)] text-[var(--color-ink)] rounded-[var(--radius-full)] text-[16px] font-medium border-2 border-[var(--color-hairline-strong)] hover:bg-[var(--color-surface)] transition-all flex items-center justify-center hover:scale-[1.02]"
              >
                Book a demo
              </Link>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-8 flex items-center gap-3 text-[14px] text-[var(--color-slate)]"
            >
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-[var(--color-brand-blue)] border-2 border-white"></div>
                <div className="w-6 h-6 rounded-full bg-[var(--color-brand-yellow)] border-2 border-white"></div>
                <div className="w-6 h-6 rounded-full bg-[var(--color-brand-coral)] border-2 border-white"></div>
              </div>
              Join 50,000+ freelancers worldwide
            </motion.div>
          </div>

          {/* Right Column: Whiteboard Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="relative w-full h-full lg:h-[650px]"
          >
            {/* Soft background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[var(--color-brand-yellow)]/20 blur-[100px] rounded-full pointer-events-none z-0"></div>

            <div className="w-full h-full min-h-[400px] lg:min-h-full bg-[var(--color-canvas)] rounded-[var(--radius-feature)] border border-[var(--color-hairline-soft)] shadow-[var(--shadow-modal)] overflow-hidden relative group z-10">
              
              {/* Mockup UI Sidebar */}
              <div className="absolute left-0 top-0 bottom-0 w-[60px] bg-[var(--color-canvas)] border-r border-[var(--color-hairline-soft)] z-20 flex flex-col items-center py-4 gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-surface-soft)] flex items-center justify-center text-[var(--color-brand-blue)] cursor-pointer"><MousePointer2 size={18} /></div>
                <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center hover:bg-[var(--color-surface)] cursor-pointer text-[var(--color-slate)]"><Layout size={18} /></div>
                <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center hover:bg-[var(--color-surface)] cursor-pointer text-[var(--color-slate)]"><Plus size={18} /></div>
                <div className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center hover:bg-[var(--color-surface)] cursor-pointer text-[var(--color-slate)]"><Users size={18} /></div>
                <div className="mt-auto w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center hover:bg-[var(--color-surface)] cursor-pointer text-[var(--color-slate)]"><Settings size={18} /></div>
              </div>

              {/* Mockup Header */}
              <div className="absolute top-4 left-[80px] right-4 z-20 flex justify-between items-center pointer-events-none">
                <div className="bg-[var(--color-canvas)]/90 backdrop-blur-md px-4 py-2 rounded-[var(--radius-lg)] shadow-sm border border-[var(--color-hairline-soft)] flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-[var(--color-success-accent)]"></div>
                  <span className="text-[14px] font-medium text-[var(--color-ink-deep)]">Website Redesign — Q3</span>
                  <div className="h-4 w-px bg-[var(--color-hairline)] mx-1"></div>
                  <MoreHorizontal size={16} className="text-[var(--color-slate)]" />
                </div>
                <div className="flex gap-2">
                  <div className="w-9 h-9 rounded-full bg-[var(--color-brand-yellow)] border-2 border-[var(--color-canvas)] shadow-sm flex items-center justify-center font-bold text-[12px] text-[var(--color-primary)]">KF</div>
                  <div className="w-9 h-9 rounded-full bg-[var(--color-brand-blue)] text-white border-2 border-[var(--color-canvas)] shadow-sm -ml-4 flex items-center justify-center font-bold text-[12px]">Alex</div>
                  <div className="w-9 h-9 rounded-full bg-[var(--color-surface)] border-2 border-[var(--color-canvas)] shadow-sm -ml-4 flex items-center justify-center text-[12px] text-[var(--color-slate)]">
                    <Plus size={14} />
                  </div>
                </div>
              </div>

              {/* Mockup Canvas Area */}
              <div className="absolute inset-0 pl-[60px] bg-[#fafafa] overflow-hidden">
                {/* Dot grid background */}
                <div className="absolute inset-0 opacity-[0.3]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--color-charcoal) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                
                {/* Animated Cursor */}
                <motion.div
                  animate={{ x: [80, 250, 150, 300], y: [120, 200, 350, 180] }}
                  transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute z-30 pointer-events-none"
                >
                  <div className="relative">
                    <MousePointer2 size={24} className="text-[var(--color-brand-blue)] drop-shadow-md fill-[var(--color-brand-blue)]" />
                    <div className="absolute top-6 left-4 bg-[var(--color-brand-blue)] text-white text-[10px] px-2 py-1 rounded-[var(--radius-sm)] font-medium whitespace-nowrap shadow-sm">
                      Alex (Client)
                    </div>
                  </div>
                </motion.div>
                
                {/* Simulated Sticky Notes */}
                <motion.div 
                  animate={{ y: [0, -3, 0] }} 
                  transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-[120px] left-[60px] w-48 lg:w-56 h-48 lg:h-56 bg-[var(--color-brand-yellow)] rounded-[var(--radius-sm)] shadow-[var(--shadow-card)] p-5 rotate-[-2deg]"
                >
                  <div className="w-full flex justify-between items-start mb-4">
                    <div className="w-10 h-1.5 bg-[var(--color-primary)]/10 rounded-full"></div>
                    <Zap size={16} className="text-[var(--color-primary)]/40" />
                  </div>
                  <div className="text-[var(--color-primary)] font-medium text-[18px] lg:text-[20px] leading-tight mb-2">Define MVP scope with client</div>
                  <div className="text-[var(--color-primary)]/70 text-[13px]">Due by Friday EOD.</div>
                </motion.div>

                <motion.div 
                  animate={{ y: [0, 4, 0] }} 
                  transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute top-[180px] left-[320px] lg:left-[350px] w-48 lg:w-56 h-48 lg:h-56 bg-[var(--color-coral-light)] rounded-[var(--radius-sm)] shadow-[var(--shadow-card)] p-5 rotate-[3deg]"
                >
                  <div className="w-full flex justify-between items-start mb-4">
                    <div className="w-10 h-1.5 bg-[var(--color-primary)]/10 rounded-full"></div>
                  </div>
                  <div className="text-[var(--color-primary)] font-medium text-[18px] lg:text-[20px] leading-tight mb-3">Review wireframes & sign off</div>
                  <div className="w-full h-12 bg-white/40 rounded-[var(--radius-sm)] border border-white/50 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-[var(--color-brand-blue)]">
                      <Layout size={14} />
                    </div>
                  </div>
                </motion.div>

                {/* Simulated Task Card */}
                <motion.div 
                  animate={{ y: [0, -2, 0] }} 
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  className="absolute bottom-[60px] left-[80px] lg:bottom-[80px] w-[280px] lg:w-[320px] bg-[var(--color-canvas)] rounded-[var(--radius-xl)] shadow-[var(--shadow-modal)] p-6 border border-[var(--color-hairline-soft)]"
                >
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-brand-blue)] flex items-center justify-center text-white"><CheckCircle2 size={20} /></div>
                    <div className="flex-1">
                      <div className="text-[14px] font-medium text-[var(--color-ink-deep)] leading-none mb-1">Brand Assets</div>
                      <div className="text-[12px] text-[var(--color-slate)]">Attached 3 files</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mb-5">
                    <div className="h-12 flex-1 bg-[var(--color-surface-soft)] rounded-[var(--radius-md)] border border-[var(--color-hairline)] flex items-center justify-center text-[var(--color-slate)] text-[10px] font-medium">Logo.svg</div>
                    <div className="h-12 flex-1 bg-[var(--color-surface-soft)] rounded-[var(--radius-md)] border border-[var(--color-hairline)] flex items-center justify-center text-[var(--color-slate)] text-[10px] font-medium">Font.zip</div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-[var(--color-hairline-soft)]">
                    <div className="px-3 py-1 bg-[var(--color-success-accent)]/10 text-[var(--color-success-accent)] text-xs font-bold rounded-[var(--radius-full)]">Approved</div>
                    <div className="text-[11px] text-[var(--color-slate)] font-medium">Just now</div>
                  </div>
                </motion.div>

                {/* Connecting Lines (SVG) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                  <path d="M 230 180 C 280 180, 280 250, 320 250" stroke="var(--color-brand-blue)" strokeWidth="3" strokeDasharray="6 6" fill="none" opacity="0.4" />
                </svg>

              </div>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
