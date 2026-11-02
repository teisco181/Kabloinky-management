import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Shield,
  MapPin,
  Clock,
  UserPlus,
  Trash2,
  X,
  Crown,
  Sparkles,
} from 'lucide-react';
import { Organization, User } from '../types';
import { StorageManager } from '../services/storage';
import { PasswordPromptModal } from './PasswordPromptModal';

interface OrganizationsTabProps {
  currentUser: User | null;
  onOpenAuth: () => void;
  organizations: Organization[];
  onRefresh: () => void;
}

export const OrganizationsTab: React.FC<OrganizationsTabProps> = ({
  currentUser,
  onOpenAuth,
  organizations,
  onRefresh,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  useEffect(() => {
    const unsub = StorageManager.subscribe(() => {
      onRefresh();
    });
    return () => unsub();
  }, [onRefresh]);

  // Create Org Form
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [hqCoordinates, setHqCoordinates] = useState('');
  const [bannerColor, setBannerColor] = useState('#10b981');
  const [formError, setFormError] = useState('');

  // Password approval for pending orgs
  const [orgToApprove, setOrgToApprove] = useState<Organization | null>(null);

  // Deletion modal state
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);

  // Deletion modal with password (any beheerder)
  const [orgToDeleteWithPassword, setOrgToDeleteWithPassword] = useState<Organization | null>(null);

  // Add member input
  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [memberRole, setMemberRole] = useState<'lid' | 'officier'>('lid');

  const canDeleteOrg = (org: Organization) => {
    if (!currentUser) return false;
    // 1. Creator / leader can delete (leaderId or case-insensitive leaderName match)
    if (
      (org.leaderId && currentUser.id && org.leaderId === currentUser.id) ||
      (org.leaderName &&
        currentUser.username &&
        org.leaderName.trim().toLowerCase() === currentUser.username.trim().toLowerCase())
    ) {
      return true;
    }
    // 2. Administrator, owner, or organizations moderator can delete
    if (
      currentUser.role === 'eigenaar' ||
      currentUser.role === 'beheerder' ||
      currentUser.role === 'moderator' ||
      StorageManager.isUserModeratorForPage(currentUser, 'organizations')
    ) {
      return true;
    }
    return false;
  };

  const approvedOrgs = organizations.filter((o) => o.approved);
  const pendingOrgs = organizations.filter((o) => !o.approved);

  const handleCreateOrg = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!currentUser) {
      setFormError('Je moet ingelogd zijn om een organisatie aan te vragen.');
      return;
    }

    if (!name.trim() || !tag.trim()) {
      setFormError('Naam en clantag zijn verplicht.');
      return;
    }

    let cleanTag = tag.trim().toUpperCase();
    if (!cleanTag.startsWith('[')) cleanTag = `[${cleanTag}`;
    if (!cleanTag.endsWith(']')) cleanTag = `${cleanTag}]`;

    const isAdmin =
      currentUser &&
      (currentUser.role === 'eigenaar' ||
        currentUser.role === 'beheerder' ||
        StorageManager.isUserModeratorForPage(currentUser, 'organizations'));

    StorageManager.addOrganization(
      {
        name: name.trim(),
        tag: cleanTag,
        description: description.trim(),
        bannerColor,
        leaderId: currentUser.id,
        leaderName: currentUser.username,
        hqCoordinates: hqCoordinates.trim(),
        approved: isAdmin,
      },
      currentUser
    );

    onRefresh();
    setIsCreateModalOpen(false);
    setName('');
    setTag('');
    setDescription('');
    setHqCoordinates('');
  };

  const handleApproveConfirm = () => {
    if (!orgToApprove) return;
    StorageManager.approveOrganization(orgToApprove.id);
    onRefresh();
    setOrgToApprove(null);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !newMemberUsername.trim()) return;

    StorageManager.addMemberToOrg(selectedOrg.id, newMemberUsername.trim(), memberRole);
    onRefresh();
    // Update local modal state
    const updated = StorageManager.getOrganizations().find((o) => o.id === selectedOrg.id);
    if (updated) setSelectedOrg(updated);
    setNewMemberUsername('');
  };

  const handleRemoveMember = (username: string) => {
    if (!selectedOrg) return;
    StorageManager.removeMemberFromOrg(selectedOrg.id, username);
    onRefresh();
    const updated = StorageManager.getOrganizations().find((o) => o.id === selectedOrg.id);
    if (updated) setSelectedOrg(updated);
  };

  const isUserLeaderOrOfficer = (org: Organization) => {
    if (!currentUser) return false;
    if (currentUser.role === 'eigenaar' || currentUser.role === 'beheerder') return true;
    const member = org.members.find((m) => m.username.toLowerCase() === currentUser.username.toLowerCase());
    return member?.role === 'leider' || member?.role === 'officier';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Users className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Server Organisaties &amp; Factions</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Vorm een alliantie, beheer je ledenlijst, claim een hoofdkwartier en organiseer groepsevenementen.
          </p>
        </div>

        <button
          onClick={() => {
            if (!currentUser) onOpenAuth();
            else setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Organisatie Oprichten</span>
        </button>
      </div>

      {/* Pending Organizations Queue (Admin or Requesting players) */}
      {pendingOrgs.length > 0 && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-amber-200">
              Aanvragen in Afwachting van Goedkeuring ({pendingOrgs.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingOrgs.map((org) => (
              <div
                key={org.id}
                className="bg-[#131923] border border-amber-500/30 rounded-lg p-3.5 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{org.name}</span>
                    <span className="text-xs font-mono font-bold text-amber-400">{org.tag}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Oprichter: <strong className="text-slate-300">{org.leaderName}</strong>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1 mt-1">{org.description}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setOrgToApprove(org)}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded transition-colors flex items-center gap-1 shrink-0 shadow-sm"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Goedkeuren</span>
                  </button>
                  {canDeleteOrg(org) ? (
                    <button
                      onClick={() => setOrgToDelete(org)}
                      className="p-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded transition-colors"
                      title="Aanvraag Verwijderen (Aanmaker / Beheerder)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setOrgToDeleteWithPassword(org)}
                      className="p-1.5 bg-slate-800/80 hover:bg-amber-500/20 text-slate-500 hover:text-amber-400 rounded transition-colors"
                      title="Aanvraag Verwijderen (Beheerderswachtwoord vereist)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Organizations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {approvedOrgs.map((org) => {
          const isMember =
            currentUser &&
            org.members.some((m) => m.username.toLowerCase() === currentUser.username.toLowerCase());

          return (
            <div
              key={org.id}
              className="bg-[#131923] border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: org.bannerColor || '#10b981' }}
                    />
                    <span className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {org.name}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-800 text-emerald-400 border border-slate-700">
                    {org.tag}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-4 line-clamp-3">
                  {org.description || 'Geen beschrijving opgegeven.'}
                </p>

                <div className="space-y-1.5 text-xs text-slate-400 font-mono mb-4">
                  <div className="flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Leider:</span>
                    <strong className="text-slate-200">{org.leaderName}</strong>
                  </div>
                  {org.hqCoordinates && (
                    <div className="flex items-center gap-1.5 text-cyan-400 truncate">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{org.hqCoordinates}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                {/* Members preview */}
                <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 mb-3">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{org.members.length} Leden</span>
                  </span>

                  <div className="flex items-center -space-x-1.5">
                    {org.members.slice(0, 4).map((m, idx) => (
                      <img
                        key={idx}
                        src={`https://mc-heads.net/avatar/${encodeURIComponent(m.username)}/24`}
                        alt={m.username}
                        title={`${m.username} (${m.role})`}
                        className="w-6 h-6 rounded-full border border-slate-900"
                        referrerPolicy="no-referrer"
                      />
                    ))}
                    {org.members.length > 4 && (
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-[9px] font-mono font-bold text-slate-300 flex items-center justify-center border border-slate-900">
                        +{org.members.length - 4}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedOrg(org)}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 border border-slate-700"
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      {isMember ? 'Beheer Ledenlijst' : 'Bekijk Organisatie'}
                    </span>
                  </button>
                  {canDeleteOrg(org) ? (
                    <button
                      onClick={() => setOrgToDelete(org)}
                      className="p-2 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors border border-slate-700 shrink-0"
                      title="Organisatie Opheffen / Verwijderen (Aanmaker / Beheerder)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setOrgToDeleteWithPassword(org)}
                      className="p-2 bg-slate-800/80 hover:bg-amber-500/20 text-slate-500 hover:text-amber-400 rounded-lg transition-colors border border-slate-700 shrink-0"
                      title="Organisatie Opheffen (Beheerderswachtwoord vereist)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Organisatie Oprichten */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#131923] border border-slate-700 rounded-xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white">Nieuwe Organisatie Oprichten</h2>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Na goedkeuring door de beheerder kun je samen evenementen organiseren en plannen publiceren.
            </p>

            {formError && (
              <div className="mb-4 p-2.5 bg-red-500/10 border border-red-500/30 rounded text-red-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Naam van de Organisatie
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="bijv. Netherite Gilde"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Clan Tag
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="[TAG]"
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white uppercase placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Banner Kleur
                  </label>
                  <input
                    type="color"
                    value={bannerColor}
                    onChange={(e) => setBannerColor(e.target.value)}
                    className="w-full h-9 bg-slate-900 border border-slate-700 rounded-lg p-1 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Hoofdkwartier Coördinaten (Optioneel)
                </label>
                <input
                  type="text"
                  value={hqCoordinates}
                  onChange={(e) => setHqCoordinates(e.target.value)}
                  placeholder="bijv. X: 350, Y: 70, Z: -120"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Doel &amp; Beschrijving
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Wat is het doel van deze groepering?"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg shadow-md"
                >
                  Aanvraag Indienen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Organization Details & Member Management */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-[#131923] border border-slate-700 rounded-xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedOrg(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: selectedOrg.bannerColor || '#10b981' }}
              />
              <h2 className="text-xl font-bold text-white">{selectedOrg.name}</h2>
              <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-800 text-emerald-400 border border-slate-700">
                {selectedOrg.tag}
              </span>
            </div>

            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              {selectedOrg.description}
            </p>

            {/* Member List & Management */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Ledenlijst ({selectedOrg.members.length})</span>
                </h3>
              </div>

              <div className="space-y-2">
                {selectedOrg.members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={`https://mc-heads.net/avatar/${encodeURIComponent(member.username)}/32`}
                        alt={member.username}
                        className="w-8 h-8 rounded border border-slate-700"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                          <span>{member.username}</span>
                          {member.role === 'leider' && (
                            <span title="Leider">
                              <Crown className="w-3.5 h-3.5 text-amber-400" />
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 capitalize">
                          Rol: {member.role} · Sinds {member.joinedAt.split('T')[0]}
                        </span>
                      </div>
                    </div>

                    {isUserLeaderOrOfficer(selectedOrg) && member.role !== 'leider' && (
                      <button
                        onClick={() => handleRemoveMember(member.username)}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded transition-colors"
                        title="Verwijder lid uit organisatie"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Member Form (if user is leader/officer) */}
              {isUserLeaderOrOfficer(selectedOrg) && (
                <form
                  onSubmit={handleAddMember}
                  className="mt-4 p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-3"
                >
                  <span className="text-xs font-bold text-slate-300 block">
                    Nieuw Lid Uitnodigen / Toevoegen
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMemberUsername}
                      onChange={(e) => setNewMemberUsername(e.target.value)}
                      placeholder="Minecraft gebruikersnaam..."
                      required
                      className="flex-1 bg-black/40 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <select
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value as 'lid' | 'officier')}
                      className="bg-black/40 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="lid">Lid</option>
                      <option value="officier">Officier</option>
                    </select>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-md transition-colors flex items-center gap-1 shrink-0"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Toevoegen</span>
                    </button>
                  </div>
                </form>
              )}
              {/* Disband Org Button for Leader or Admin or with Password */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-red-400 block">Organisatie Beheer</span>
                  <span className="text-[11px] text-slate-500">Ontbind deze groepering en ontkoppel alle leden.</span>
                </div>
                {canDeleteOrg(selectedOrg) ? (
                  <button
                    type="button"
                    onClick={() => setOrgToDelete(selectedOrg)}
                    className="px-3.5 py-2 bg-red-950/60 hover:bg-red-900 text-red-300 font-bold text-xs rounded-lg border border-red-700/60 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Organisatie Opheffen</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setOrgToDeleteWithPassword(selectedOrg)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 font-bold text-xs rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Opheffen met Wachtwoord</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Org Confirmation Modal */}
      {orgToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#131923] border border-red-500/40 rounded-xl shadow-2xl p-6 relative">
            <button
              onClick={() => setOrgToDelete(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/40 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Organisatie Opheffen / Verwijderen</h3>
                <p className="text-xs text-red-300">Deze actie kan niet ongedaan worden gemaakt.</p>
              </div>
            </div>

            <div className="my-4 p-3.5 bg-slate-900 border border-slate-800 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-white text-sm">{orgToDelete.name}</span>
                <span className="text-xs font-mono font-bold text-emerald-400">{orgToDelete.tag}</span>
              </div>
              <p className="text-xs text-slate-400">
                Oprichter: {orgToDelete.leaderName} · {orgToDelete.members?.length || 0} leden
              </p>
            </div>

            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Weet je zeker dat je deze organisatie definitief wilt opheffen en verwijderen? Alle leden worden ontkoppeld en de groepering verdwijnt uit het systeem en de cloud database.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setOrgToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={() => {
                  StorageManager.deleteOrganization(orgToDelete.id);
                  onRefresh();
                  if (selectedOrg && selectedOrg.id === orgToDelete.id) {
                    setSelectedOrg(null);
                  }
                  setOrgToDelete(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-md transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Organisatie Definitief Verwijderen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal for Admin Org Approval */}
      <PasswordPromptModal
        isOpen={Boolean(orgToApprove)}
        title="Organisatie Goedkeuren"
        description={`Voer het wachtwoord in om de organisatie "${orgToApprove?.name}" ${orgToApprove?.tag} goed te keuren.`}
        onClose={() => setOrgToApprove(null)}
        onSuccess={handleApproveConfirm}
      />

      {/* Password Modal for Admin Org Deletion */}
      <PasswordPromptModal
        isOpen={Boolean(orgToDeleteWithPassword)}
        title="Organisatie Opheffen (Beheer)"
        description={`Voer het beheerder- of moederwachtwoord in om de organisatie "${orgToDeleteWithPassword?.name}" ${orgToDeleteWithPassword?.tag} definitief op te heffen en te verwijderen.`}
        onClose={() => setOrgToDeleteWithPassword(null)}
        onSuccess={() => {
          if (orgToDeleteWithPassword) {
            StorageManager.deleteOrganization(orgToDeleteWithPassword.id);
            onRefresh();
            if (selectedOrg && selectedOrg.id === orgToDeleteWithPassword.id) {
              setSelectedOrg(null);
            }
            setOrgToDeleteWithPassword(null);
          }
        }}
      />
    </div>
  );
};
