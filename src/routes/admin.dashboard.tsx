import React, { useState } from 'react';
import { 
  BarChart3, BookOpen, Users, Calendar, Megaphone, 
  Layers, LogOut, ChevronRight, GraduationCap, Monitor,
  Plus, Check, Sparkles, Clock, Globe, ArrowUpRight
} from 'lucide-react';

type ModuleTab = 'analytics' | 'cbt-content' | 'directory' | 'mentors' | 'announcements';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<ModuleTab>('analytics');

  // Module 2 Form States (CBT Content Manager)
  const [testTitle, setTestTitle] = useState('');
  const [testSubject, setTestSubject] = useState('Biology');
  const [duration, setDuration] = useState('180');
  const [targetBatch, setTargetBatch] = useState('Dropper');

  // Dummy State for Demonstration mapping
  const activeStudentSessions = [
    { id: 1, name: 'Aman Sharma', track: 'Dropper', pack: 'Premium Mentorship', devices: 2 },
    { id: 2, name: 'Priya Patel', track: '12th Class', pack: 'Test Series Core', devices: 1 },
    { id: 3, name: 'Rahul Verma', track: '11th Class', pack: 'Full Package Elite', devices: 3 }
  ];

  return (
    <div className="relative min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100">
      {/* Background Ambience Layers matching dashboard style */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[var(--sky-soft)] rounded-full blur-[140px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-[var(--mint-soft)] rounded-full blur-[120px] opacity-20 pointer-events-none" />

      {/* Primary Global Dashboard Navigation Top Header */}
      <header className="sticky top-0 z-50 clay border-b border-white/5 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-sky-500 to-teal-500 rounded-xl flex items-center justify-center shadow-md">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">The Apron Boy Admin</h2>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Super Admin</span>
            </div>
            <p className="text-[11px] text-slate-400">Application Architecture Monitoring Suite</p>
          </div>
        </div>
        <button className="clay-btn-ghost px-3 py-1.5 text-xs text-rose-400 flex items-center gap-1.5 rounded-lg border border-rose-500/10 hover:bg-rose-500/10 transition-all">
          <LogOut className="w-3.5 h-3.5" />
          Terminate Session
        </button>
      </header>

      {/* Operational Grid Layout Workspace */}
      <div className="flex flex-1 w-full max-w-[1600px] mx-auto px-4 py-6 gap-6">
        
        {/* Sticky Modular Navigation Sidebar */}
        <aside className="w-72 hidden md:block flex-shrink-0">
          <div className="clay sticky top-24 p-4 rounded-2xl border border-white/5 space-y-1.5">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">Management Framework</p>
            
            {[
              { id: 'analytics', label: 'Executive Overview', icon: BarChart3 },
              { id: 'cbt-content', label: 'CBT Engine Content', icon: BookOpen },
              { id: 'directory', label: 'Student Directory', icon: Users },
              { id: 'mentors', label: 'Mentor Schedules', icon: Calendar },
              { id: 'announcements', label: 'Broadcast Feeds', icon: Megaphone },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as ModuleTab)}
                  className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    isSelected 
                      ? 'bg-sky-500/10 border border-sky-500/20 text-sky-400 shadow-inner' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-sky-400' : 'text-slate-400'}`} />
                    {item.label}
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'rotate-90 text-sky-400' : 'text-slate-600'}`} />
                </button>
              );
            })}
          </div>
        </aside>

        {/* Dynamic Canvas Workspace Module Panels */}
        <main className="flex-1 min-w-0">
          
          {/* Module 1: Executive Analytics Overview */}
          {activeTab === 'analytics' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { title: 'Total Active Students', metric: '1,482', detail: '+12% growth cycle', color: 'from-blue-500 to-sky-400' },
                  { title: 'Live Mentorship Pipeline', metric: '234 Slots', detail: '89% utilization margin', color: 'from-emerald-500 to-teal-400' },
                  { title: 'Razorpay Gross Revenue', metric: '₹4,89,200', detail: 'Current billing calendar', color: 'from-purple-500 to-indigo-400' },
                  { title: 'Cumulative CBT Exams', metric: '12,401', detail: 'NTA replica engine sync', color: 'from-amber-500 to-orange-400' }
                ].map((card, idx) => (
                  <div key={idx} className="clay p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
                    <span className="text-xs font-semibold text-slate-400">{card.title}</span>
                    <div className="my-3">
                      <h3 className={`text-2xl font-black bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}>
                        {card.metric}
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3 text-emerald-400" /> {card.detail}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Module 2: Online Test Series & Content Manager */}
          {activeTab === 'cbt-content' && (
            <div className="space-y-6 animate-fade-in">
              <div className="clay p-6 rounded-2xl border border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-base font-bold text-white">NTA 1:1 Replica CBT Test Configurator</h3>
                    <p className="text-xs text-slate-400">Map examination modules into the standardized engine grid deployment schema.</p>
                  </div>
                  <Sparkles className="w-5 h-5 text-sky-400" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400">Assessment Name/Title</label>
                      <input 
                        type="text" 
                        value={testTitle} 
                        onChange={(e) => setTestTitle(e.target.value)}
                        placeholder="All India Full Syllabus Test - 04" 
                        className="clay-inset w-full bg-slate-900/40 p-3 rounded-xl text-xs text-white placeholder-slate-600 border border-white/5 focus:outline-none focus:border-sky-500/20"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400">Subject Category</label>
                        <select 
                          value={testSubject} 
                          onChange={(e) => setTestSubject(e.target.value)}
                          className="clay-inset w-full bg-slate-900/40 p-3 rounded-xl text-xs text-slate-200 border border-white/5 focus:outline-none appearance-none"
                        >
                          <option value="Biology">Biology</option>
                          <option value="Physics">Physics</option>
                          <option value="Chemistry">Chemistry</option>
                          <option value="Full Mock">Full-Length Assessment</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-400">Allocated Time (Mins)</label>
                        <input 
                          type="number" 
                          value={duration} 
                          onChange={(e) => setDuration(e.target.value)}
                          className="clay-inset w-full bg-slate-900/40 p-3 rounded-xl text-xs text-white border border-white/5 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400">Target Cohort / Tier Batch Grouping</label>
                      <div className="grid grid-cols-3 gap-2.5">
                        {['Dropper', '12th Class', '11th Class'].map((tier) => {
                          const isActive = targetBatch === tier;
                          return (
                            <button
                              key={tier}
                              type="button"
                              onClick={() => setTargetBatch(tier)}
                              className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                                isActive 
                                  ? 'bg-gradient-to-tr from-sky-500/20 to-teal-500/20 text-sky-400 border-sky-500/30' 
                                  : 'bg-slate-900/30 text-slate-400 border-white/5 hover:bg-white/5'
                              }`}
                            >
                              {tier}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button className="clay-btn w-full mt-6 bg-sky-500 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-md">
                      <Plus className="w-4 h-4" /> Assemble & Append Questions Matrix
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Module 3: User & Student Directory */}
          {activeTab === 'directory' && (
            <div className="space-y-6 animate-fade-in">
              <div className="clay p-5 rounded-2xl border border-white/5">
                <h3 className="text-sm font-bold text-white mb-4">Onboarded Academic Profiles</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-separate border-spacing-y-2 text-left text-xs">
                    <thead>
                      <tr className="text-slate-500 uppercase tracking-wider">
                        <th className="pb-2 pl-4">Student Profile</th>
                        <th className="pb-2">Academic Track</th>
                        <th className="pb-2">Active Packages</th>
                        <th className="pb-2 pr-4 text-right">Device Session Security</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeStudentSessions.map((student) => (
                        <tr key={student.id} className="clay bg-slate-900/30 border border-white/5 hover:bg-slate-900/50 transition-colors">
                          <td className="py-3.5 pl-4 rounded-l-xl font-bold text-white flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-[10px] text-sky-400 font-black">
                              {student.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            {student.name}
                          </td>
                          <td className="py-3.5 text-slate-300 font-medium">{student.track}</td>
                          <td className="py-3.5">
                            <span className="px-2.5 py-1 rounded-md bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-bold">
                              {student.pack}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 rounded-r-xl text-right">
                            <button className="clay-btn-ghost px-2.5 py-1 rounded-md bg-slate-900 border border-white/10 text-slate-400 hover:text-white transition-all text-[10px] font-bold inline-flex items-center gap-1">
                              <Monitor className="w-3 h-3 text-sky-400" /> Inspect {student.devices} Active Links
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Module 4: Mentor Allocation & Schedule Hub */}
          {activeTab === 'mentors' && (
            <div className="space-y-6 animate-fade-in">
              <div className="clay p-6 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4 text-teal-400" />
                  <h3 className="text-sm font-bold text-white">Google Workspace Live API Monitor</h3>
                </div>
                
                <div className="space-y-3">
                  {[
                    { batch: 'Dropper Batch Alpha', mentor: 'Dr. Rohan Mehra', time: '16:00 - 17:30', status: 'Meet Link Synced' },
                    { batch: '12th Biology Intensive', mentor: 'Prof. Sana Sheikh', time: '18:30 - 20:00', status: 'Pending Generation' }
                  ].map((slot, index) => (
                    <div key={index} className="clay p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{slot.batch}</span>
                          <span className="text-[10px] text-slate-500">• Allocated to {slot.mentor}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 mt-1">
                          <Clock className="w-3 h-3 text-sky-400" /> {slot.time}
                        </div>
                      </div>
                      <div>
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                          slot.status === 'Meet Link Synced' 
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        }`}>
                          {slot.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Module 5: Announcement Broadcast System */}
          {activeTab === 'announcements' && (
            <div className="space-y-6 animate-fade-in">
              <div className="clay p-6 rounded-2xl border border-white/5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Global Feed Distribution Engine</h3>
                  <p className="text-xs text-slate-400">Push targeted Markdown updates directly onto individual student system layouts.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Broadcast Alert Copy</label>
                  <textarea 
                    rows={4}
                    placeholder="Provide clear directives regarding system changes, updates, or exam scheduling instructions here..." 
                    className="clay-inset w-full bg-slate-900/40 p-3 rounded-xl text-xs text-white placeholder-slate-600 border border-white/5 focus:outline-none focus:border-sky-500/20 resize-none font-sans"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Distribution:</span>
                    <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-bold uppercase">All Batches</span>
                  </div>
                  <button className="clay-btn bg-gradient-to-r from-sky-500 to-teal-500 text-white font-bold text-xs py-2.5 px-5 rounded-xl flex items-center gap-1.5 shadow-md self-end sm:self-auto">
                    <Check className="w-3.5 h-3.5" /> Launch Stream Broadcast
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}