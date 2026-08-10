import Link from 'next/link';
import { Apple, Play, Sparkles } from 'lucide-react';

export function MarketingFooter() {
  return (
    <footer className="bg-[#050038] pt-24 pb-12 px-8">
      <div className="max-w-[1280px] mx-auto">
        
        {/* Footer Top CTA */}
        <div className="relative bg-gradient-to-br from-[#0a005c] to-[#050038] rounded-[var(--radius-feature)] mb-24 text-center px-8 py-20 border border-white/5 overflow-hidden shadow-2xl">
          {/* Decorative glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[var(--color-brand-blue)]/20 blur-[120px] rounded-full pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-[var(--radius-xl)] bg-white/10 mb-8 backdrop-blur-md border border-white/20">
              <Sparkles size={32} className="text-[var(--color-brand-yellow)]" />
            </div>
            <h2 className="text-[40px] md:text-[56px] font-medium leading-[1.1] tracking-[-1.5px] text-white mb-6">
              Join 50M+ users building the future
            </h2>
            <p className="text-[18px] md:text-[20px] text-white/60 mb-10 max-w-2xl mx-auto font-normal">
              Get started with Freelancy today. No credit card required. Cancel anytime.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-10 py-5 bg-white text-[#050038] rounded-[var(--radius-full)] text-[18px] font-medium hover:scale-[1.02] transition-transform shadow-[var(--shadow-card)]"
            >
              Get started free
            </Link>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-8 gap-y-16 mb-20">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-8 group">
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-brand-yellow)] flex items-center justify-center font-bold text-xl text-[#050038] group-hover:scale-105 transition-transform">
                F
              </div>
              <span className="font-medium text-white text-lg">Freelancy</span>
            </Link>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 px-4 py-2.5 bg-white/5 rounded-[var(--radius-md)] border border-white/10 w-fit cursor-pointer hover:bg-white/10 transition-colors">
                <Apple size={20} className="text-white" />
                <span className="text-[13px] font-bold text-white">App Store</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-2.5 bg-white/5 rounded-[var(--radius-md)] border border-white/10 w-fit cursor-pointer hover:bg-white/10 transition-colors">
                <Play size={20} className="text-white" />
                <span className="text-[13px] font-bold text-white">Google Play</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-white font-medium text-[16px] mb-6">Product</h4>
            <ul className="flex flex-col gap-4">
              <li><Link href="#" className="text-[14px] text-white/50 hover:text-white transition-colors">Online whiteboard</Link></li>
              <li><Link href="#" className="text-[14px] text-white/50 hover:text-white transition-colors">Apps & Integrations</Link></li>
              <li><Link href="#" className="text-[14px] text-white/50 hover:text-white transition-colors">Templates</Link></li>
              <li><Link href="#" className="text-[14px] text-white/50 hover:text-white transition-colors">Freelancy AI</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium text-[16px] mb-6">Solutions</h4>
            <ul className="flex flex-col gap-4">
              <li><Link href="#" className="text-[14px] text-white/50 hover:text-white transition-colors">Meetings & Workshops</Link></li>
              <li><Link href="#" className="text-[14px] text-white/50 hover:text-white transition-colors">Brainstorming</Link></li>
              <li><Link href="#" className="text-[14px] text-white/50 hover:text-white transition-colors">Agile Workflows</Link></li>
              <li><Link href="#" className="text-[14px] text-white/50 hover:text-white transition-colors">Diagramming</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium text-[16px] mb-6">Resources</h4>
            <ul className="flex flex-col gap-4">
              <li><Link href="#" className="text-[14px] text-white/50 hover:text-white transition-colors">Freelancy Academy</Link></li>
              <li><Link href="#" className="text-[14px] text-white/50 hover:text-white transition-colors">Help Center</Link></li>
              <li><Link href="#" className="text-[14px] text-white/50 hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="#" className="text-[14px] text-white/50 hover:text-white transition-colors">Community</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-medium text-[16px] mb-6">Company</h4>
            <ul className="flex flex-col gap-4">
              <li><Link href="#" className="text-[14px] text-white/50 hover:text-white transition-colors">About us</Link></li>
              <li><Link href="#" className="text-[14px] text-white/50 hover:text-white transition-colors">Careers 🚀</Link></li>
              <li><Link href="#" className="text-[14px] text-white/50 hover:text-white transition-colors">Freelancy in the News</Link></li>
              <li><Link href="#" className="text-[14px] text-white/50 hover:text-white transition-colors">Contact us</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex gap-8">
            <span className="text-[13px] text-white/50">© 2026 Freelancy</span>
            <Link href="#" className="text-[13px] text-white/50 hover:text-white transition-colors">Terms of Service</Link>
            <Link href="#" className="text-[13px] text-white/50 hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="text-[13px] text-white/50 hover:text-white transition-colors">Manage Cookies</Link>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"></div>
            <div className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"></div>
            <div className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"></div>
            <div className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"></div>
          </div>
        </div>

      </div>
    </footer>
  );
}
