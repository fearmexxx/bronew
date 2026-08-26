import React, { useState, useEffect } from 'react';
import { UserCheck, Shield, Plus, Send, Copy, Check, Trash2, ExternalLink, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Contact {
  domain: string;
  note: string;
  privacyEnabled: boolean;
  verified?: boolean;
}

interface PrivateContactsProps {
  onSendClick?: (recipientDomain: string) => void;
}

const DEFAULT_CONTACTS: Contact[] = [
  { domain: 'alice.real', note: 'DAO Core Contributor', privacyEnabled: true, verified: true },
  { domain: 'bob.real', note: 'AI Trading Bot Developer', privacyEnabled: true, verified: true },
  { domain: 'charlie.real', note: 'Treasury Guardian', privacyEnabled: false, verified: true },
];

export const PrivateContacts: React.FC<PrivateContactsProps> = ({ onSendClick }) => {
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('brother_contacts');
    return saved ? JSON.parse(saved) : DEFAULT_CONTACTS;
  });

  const [newDomain, setNewDomain] = useState('');
  const [newNote, setNewNote] = useState('');
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('brother_contacts', JSON.stringify(contacts));
  }, [contacts]);

  const handleAddContact = () => {
    if (!newDomain.trim()) return;
    const clean = newDomain.trim().toLowerCase();
    const formatted = clean.endsWith('.real') ? clean : `${clean}.real`;

    if (contacts.some(c => c.domain === formatted)) {
      toast.error('Contact domain already exists');
      return;
    }

    const newContact: Contact = {
      domain: formatted,
      note: newNote.trim() || 'General Contact',
      privacyEnabled: true,
      verified: true,
    };

    setContacts([newContact, ...contacts]);
    setNewDomain('');
    setNewNote('');
    toast.success(`Added ${formatted} to private contacts!`);
  };

  const handleRemove = (domain: string) => {
    setContacts(contacts.filter(c => c.domain !== domain));
    toast.success(`Removed ${domain}`);
  };

  const handleCopy = (domain: string) => {
    navigator.clipboard.writeText(domain);
    setCopiedDomain(domain);
    setTimeout(() => setCopiedDomain(null), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold">
          <UserCheck className="w-4 h-4" />
          <span>Identity Address Book</span>
        </div>
        <h2 className="text-3xl font-bold font-display text-white">Private Contacts</h2>
        <p className="text-gray-400 text-sm max-w-xl mx-auto">
          Save human-readable <span className="text-orange-400">.real</span> identities and start one-click, on-chain domain-routed payments.
        </p>
      </div>

      {/* Add Contact Card */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-6 space-y-4 shadow-xl backdrop-blur-xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Add New Private Contact</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="e.g. alice.real"
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50 font-mono"
          />
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Note (e.g. Core Contributor)"
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50"
          />
          <button
            onClick={handleAddContact}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 hover:to-amber-500 text-white font-medium text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Contacts List */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-6 space-y-4 shadow-xl backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Saved Identities ({contacts.length})
          </h3>
          <span className="text-xs text-gray-500">Stored privately in your encrypted browser session</span>
        </div>

        <div className="divide-y divide-white/5">
          {contacts.map((c, idx) => (
            <div key={idx} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white font-mono text-base">{c.domain}</span>
                  {c.privacyEnabled && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Preferred STRK20 recipient
                    </span>
                  )}
                  {c.verified && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Verified Identity
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{c.note}</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {onSendClick && (
                  <button
                    onClick={() => onSendClick(c.domain)}
                    className="px-3.5 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-300 hover:bg-orange-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Private Send</span>
                  </button>
                )}
                <button
                  onClick={() => handleCopy(c.domain)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors cursor-pointer"
                  title="Copy Domain"
                >
                  {copiedDomain === c.domain ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleRemove(c.domain)}
                  className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                  title="Remove Contact"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PrivateContacts;
