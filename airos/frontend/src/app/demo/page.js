'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function DemoPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '' });
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center relative py-16">
      <div className="orb w-96 h-96 -top-20 -left-20"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />

      <div className="max-w-5xl w-full mx-auto px-6 relative z-10">
        <div className="text-center mb-14">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold">A</div>
            <span className="font-bold text-xl" style={{ fontFamily: 'Space Grotesk' }}>AIROS</span>
          </Link>
          <h1 className="text-5xl font-black mb-4" style={{ fontFamily: 'Space Grotesk' }}>
            See AIROS in <span className="gradient-text">Action</span>
          </h1>
          <p className="text-[var(--text-secondary)] text-lg">Book a 30-minute live demo with our team</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Benefits */}
          <div>
            <h3 className="font-bold text-xl mb-6">What you&apos;ll see in the demo:</h3>
            <div className="space-y-4">
              {[
                { icon: '🧠', title: 'AI in action', desc: 'Watch AIROS detect intent and generate Arabic replies in real-time' },
                { icon: '🎯', title: 'Live deal pipeline', desc: 'See leads automatically scored and moved through stages' },
                { icon: '🔗', title: 'Channel unification', desc: 'Messages from all 4 channels arriving in one inbox' },
                { icon: '📦', title: 'Product context', desc: 'AI replies with real prices, offers, and shipping info from your store' },
                { icon: '📊', title: 'Revenue reports', desc: 'Conversion funnels, agent performance, AI accuracy' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 glass rounded-xl">
                  <span className="text-2xl flex-shrink-0">{item.icon}</span>
                  <div>
                    <div className="font-semibold text-sm mb-1">{item.title}</div>
                    <div className="text-xs text-[var(--text-muted)]">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="glass-bright rounded-2xl p-8">
            {submitted ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="font-bold text-xl mb-2">Request Received!</h3>
                <p className="text-[var(--text-secondary)] text-sm mb-6">We&apos;ll reach out within 24 hours to schedule your demo.</p>
                <Link href="/" className="btn-primary text-sm py-2.5 px-6">Back to Home</Link>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-xl mb-6">Book your demo</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {[
                    { key: 'name', label: 'Full Name', placeholder: 'Ahmed Mohamed', type: 'text' },
                    { key: 'email', label: 'Work Email', placeholder: 'ahmed@store.com', type: 'email' },
                    { key: 'company', label: 'Company Name', placeholder: 'Your Store', type: 'text' },
                    { key: 'phone', label: 'Phone (WhatsApp)', placeholder: '+20 xxx xxx xxxx', type: 'tel' },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-2">{field.label}</label>
                      <input type={field.type} className="input-field" placeholder={field.placeholder}
                        value={form[field.key]} onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))} required />
                    </div>
                  ))}
                  <button type="submit" className="btn-primary w-full py-3 mt-2">
                    Book My Demo →
                  </button>
                </form>
                <p className="text-xs text-center text-[var(--text-muted)] mt-4">
                  No obligation · Usually available within 2 business days
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
