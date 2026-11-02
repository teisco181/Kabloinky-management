/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PageId, User, ServerSettings, NotificationItem, Organization } from './types';
import { StorageManager, requestNotificationPermission } from './services/storage';
import { Navbar } from './components/Navbar';
import { HomeTab } from './components/HomeTab';
import { EventsTab } from './components/EventsTab';
import { OrganizationsTab } from './components/OrganizationsTab';
import { PlansTab } from './components/PlansTab';
import { RulesTab } from './components/RulesTab';
import { PunishmentsTab } from './components/PunishmentsTab';
import { BountiesTab } from './components/BountiesTab';
import { SettingsTab } from './components/SettingsTab';
import { RegisterPage } from './components/RegisterPage';
import { AuthModal } from './components/AuthModal';
import { Lock, Sparkles, ArrowLeft } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<PageId>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(() => StorageManager.getCurrentUser());
  const [settings, setSettings] = useState<ServerSettings>(() => StorageManager.getSettings());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    StorageManager.getNotifications()
  );
  const [organizations, setOrganizations] = useState<Organization[]>(() =>
    StorageManager.getOrganizations()
  );
  const [users, setUsers] = useState<User[]>(() => StorageManager.getUsers());

  // Auth modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Check if accounts exist (dynamically updated from Firestore cloud)
  const hasExistingUsers = users.length > 0;

  const refreshState = useCallback(() => {
    setCurrentUser(StorageManager.getCurrentUser());
    setSettings(StorageManager.getSettings());
    setNotifications(StorageManager.getNotifications());
    setOrganizations(StorageManager.getOrganizations());
    setUsers(StorageManager.getUsers());
  }, []);

  // Real-time synchronization subscription across all devices and friends
  useEffect(() => {
    const unsubscribe = StorageManager.subscribe(() => {
      refreshState();
    });
    return () => unsubscribe();
  }, [refreshState]);

  useEffect(() => {
    // If users arrived from the cloud and the modal was open because of 0 initial users, close it
    if (hasExistingUsers && isAuthModalOpen) {
      setIsAuthModalOpen(false);
    }
  }, [hasExistingUsers, isAuthModalOpen]);

  const handleUpdateSettings = (newSettings: Partial<ServerSettings>) => {
    const updated = StorageManager.updateSettings(newSettings);
    setSettings(updated);
  };

  const handleLogout = () => {
    StorageManager.setCurrentUser(null);
    setCurrentUser(null);
  };

  const handleMarkNotificationRead = (id: string) => {
    StorageManager.markNotificationRead(id);
    setNotifications(StorageManager.getNotifications());
  };

  const handleClearNotifications = () => {
    StorageManager.clearAllNotifications();
    setNotifications([]);
  };

  const handleRequestPushPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      StorageManager.notify(
        'Push Meldingen Geactiveerd!',
        'Je ontvangt nu meldingen van goedgekeurde evenementen en reacties op je plannen.',
        'system'
      );
      setNotifications(StorageManager.getNotifications());
    } else {
      alert('Meldingen zijn geblokkeerd of niet ondersteund in deze browser.');
    }
  };

  // Check if active tab is locked/disabled:
  // Settings page CANNOT be turned off! Page permissions are managed per player.
  let isTabDisabled = false;
  if (activeTab === 'settings') {
    isTabDisabled = false; // The settings page CANNOT be turned off
  } else if (currentUser) {
    if (Array.isArray(currentUser.allowedPages) && !currentUser.allowedPages.includes(activeTab)) {
      isTabDisabled = true;
    } else if (settings.pageAccess[activeTab] && !settings.pageAccess[activeTab].enabled) {
      isTabDisabled = true;
    }
  } else {
    // Guests
    if (settings.pageAccess[activeTab] && !settings.pageAccess[activeTab].enabled) {
      isTabDisabled = true;
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0f14] text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* First User Welcome Notification Bar if needed */}
      {!hasExistingUsers && (
        <div className="bg-emerald-600 px-4 py-2 text-slate-950 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>
              Allereerste keer op de website? Registreer het eerste account om te starten als Eigenaar!
            </span>
          </div>
          <button
            onClick={() => setActiveTab('register')}
            className="px-2.5 py-1 bg-slate-950 text-emerald-300 text-[11px] rounded hover:bg-slate-900 transition-colors uppercase tracking-wider shrink-0"
          >
            Naar Registratie Pagina →
          </button>
        </div>
      )}

      {/* Main Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        settings={settings}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onClearNotifications={handleClearNotifications}
        onRequestBrowserNotification={handleRequestPushPermission}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {isTabDisabled ? (
          <div className="max-w-md mx-auto py-16 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Pagina Momenteel Niet Toegankelijk</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Het tabblad &quot;{activeTab}&quot; is tijdelijk uitgeschakeld voor dit account.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setActiveTab('home')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Terug naar Home</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeTab
                settings={settings}
                onNavigate={setActiveTab}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'events' && (
              <EventsTab
                currentUser={currentUser}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                organizations={organizations}
              />
            )}

            {activeTab === 'organizations' && (
              <OrganizationsTab
                currentUser={currentUser}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                organizations={organizations}
                onRefresh={refreshState}
              />
            )}

            {activeTab === 'plans' && (
              <PlansTab
                currentUser={currentUser}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                organizations={organizations}
              />
            )}

            {activeTab === 'rules' && (
              <RulesTab
                currentUser={currentUser}
                onOpenAuth={() => setIsAuthModalOpen(true)}
              />
            )}

            {activeTab === 'punishments' && (
              <PunishmentsTab
                currentUser={currentUser}
                onOpenAuth={() => setIsAuthModalOpen(true)}
              />
            )}

            {activeTab === 'bounties' && (
              <BountiesTab
                currentUser={currentUser}
                onOpenAuth={() => setIsAuthModalOpen(true)}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsTab
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                currentUser={currentUser}
                onRefreshUsers={refreshState}
              />
            )}

            {(activeTab === 'register' || activeTab === 'login') && (
              <RegisterPage
                initialMode={activeTab === 'login' ? 'login' : 'register'}
                currentUser={currentUser}
                onLogout={handleLogout}
                onSuccess={(user) => {
                  setCurrentUser(user);
                  refreshState();
                }}
                onNavigate={setActiveTab}
                organizations={organizations}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0a0d12] py-6 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">{settings.serverName}</span>
            <span>·</span>
            <span className="font-mono">{settings.serverVersion}</span>
            <span>·</span>
            <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Cloud Live Sync
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setActiveTab('rules')}
              className="hover:text-slate-300 transition-colors"
            >
              Regels
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className="hover:text-slate-300 transition-colors"
            >
              Instellingen
            </button>
            <span>·</span>
            <span>Gemeenschap &amp; Beheer Portaal</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          refreshState();
        }}
      />
    </div>
  );
}
