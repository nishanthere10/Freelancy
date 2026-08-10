'use client';

import { motion } from 'framer-motion';
import { LayoutDashboard, Users, FileText, Zap, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export function FeatureGrid() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <section className="py-[120px] bg-[var(--color-canvas)] border-t border-[var(--color-hairline-soft)]">
      <div className="max-w-[1280px] mx-auto px-8">
        
        <div className="mb-16 max-w-2xl">
          <h2 className="text-[40px] md:text-[48px] font-medium leading-[1.15] tracking-[-1px] text-[var(--color-ink)] mb-6">
            Everything you need to run your freelance business
          </h2>
          <p className="text-[18px] text-[var(--color-slate)] leading-relaxed">
            Ditch the scattered tools. Freelancy brings your clients, projects, and invoices into one beautiful space designed specifically for independent professionals.
          </p>
        </div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {/* Yellow Feature */}
          <motion.div variants={item} className="group relative bg-[var(--color-brand-yellow)] p-8 rounded-[var(--radius-xxxl)] flex flex-col h-[340px] hover:-translate-y-2 transition-transform duration-300 ease-out cursor-pointer shadow-sm hover:shadow-md">
            <div className="w-14 h-14 bg-black/5 rounded-[var(--radius-xl)] flex items-center justify-center mb-8">
              <LayoutDashboard size={28} className="text-[var(--color-primary)]" />
            </div>
            <h3 className="text-[24px] font-medium text-[var(--color-primary)] mb-3 tracking-[-0.5px]">Infinite Canvas</h3>
            <p className="text-[var(--color-primary)]/80 text-[16px] leading-relaxed mb-auto">
              Map out projects, draw user flows, and plan your week without boundaries.
            </p>
            <div className="flex items-center text-[14px] font-bold text-[var(--color-primary)] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
              Learn more <ArrowUpRight size={16} className="ml-1" />
            </div>
          </motion.div>

          {/* Coral Feature */}
          <motion.div variants={item} className="group relative bg-[var(--color-coral-light)] p-8 rounded-[var(--radius-xxxl)] flex flex-col h-[340px] hover:-translate-y-2 transition-transform duration-300 ease-out cursor-pointer shadow-sm hover:shadow-md">
            <div className="w-14 h-14 bg-black/5 rounded-[var(--radius-xl)] flex items-center justify-center mb-8">
              <Users size={28} className="text-[var(--color-primary)]" />
            </div>
            <h3 className="text-[24px] font-medium text-[var(--color-primary)] mb-3 tracking-[-0.5px]">Client Portals</h3>
            <p className="text-[var(--color-primary)]/80 text-[16px] leading-relaxed mb-auto">
              Share progress instantly. Clients can comment directly on your boards in real-time.
            </p>
            <div className="flex items-center text-[14px] font-bold text-[var(--color-primary)] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
              Learn more <ArrowUpRight size={16} className="ml-1" />
            </div>
          </motion.div>

          {/* Teal Feature */}
          <motion.div variants={item} className="group relative bg-[var(--color-teal-light)] p-8 rounded-[var(--radius-xxxl)] flex flex-col h-[340px] hover:-translate-y-2 transition-transform duration-300 ease-out cursor-pointer shadow-sm hover:shadow-md">
            <div className="w-14 h-14 bg-black/5 rounded-[var(--radius-xl)] flex items-center justify-center mb-8">
              <FileText size={28} className="text-[var(--color-primary)]" />
            </div>
            <h3 className="text-[24px] font-medium text-[var(--color-primary)] mb-3 tracking-[-0.5px]">Smart Invoicing</h3>
            <p className="text-[var(--color-primary)]/80 text-[16px] leading-relaxed mb-auto">
              Turn project milestones into paid invoices with a single click. Get paid faster.
            </p>
            <div className="flex items-center text-[14px] font-bold text-[var(--color-primary)] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
              Learn more <ArrowUpRight size={16} className="ml-1" />
            </div>
          </motion.div>

          {/* Rose Feature */}
          <motion.div variants={item} className="group relative bg-[var(--color-brand-rose)] p-8 rounded-[var(--radius-xxxl)] flex flex-col h-[340px] hover:-translate-y-2 transition-transform duration-300 ease-out cursor-pointer shadow-sm hover:shadow-md">
            <div className="w-14 h-14 bg-black/5 rounded-[var(--radius-xl)] flex items-center justify-center mb-8">
              <Zap size={28} className="text-[var(--color-primary)]" />
            </div>
            <h3 className="text-[24px] font-medium text-[var(--color-primary)] mb-3 tracking-[-0.5px]">AI Workflows</h3>
            <p className="text-[var(--color-primary)]/80 text-[16px] leading-relaxed mb-auto">
              Let AI draft proposals, generate wireframes, and organize your messy notes.
            </p>
            <div className="flex items-center text-[14px] font-bold text-[var(--color-primary)] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
              Learn more <ArrowUpRight size={16} className="ml-1" />
            </div>
          </motion.div>

        </motion.div>

        <div className="mt-16 text-center">
          <Link href="/features" className="inline-flex items-center gap-2 text-[16px] font-medium text-[var(--color-brand-blue)] hover:text-[var(--color-blue-pressed)] transition-colors">
            Explore all features <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
