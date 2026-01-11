// Copyright (c) 2025 Mustard Seed Networks. All rights reserved.

/**
 * Profile Store
 *
 * Zustand store for managing test configuration profiles.
 * Follows Seed patterns for state management with React Query integration.
 *
 * Features:
 * - Profile CRUD operations
 * - Active profile management
 * - Backend defaults fallback
 * - Settings update by category
 * - Import/Export functionality
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { profileApi } from '../api/profiles';
import type {
  CreateProfileRequest,
  Profile,
  ProfileConfig,
  ProfileExport,
  ProfileImportRequest,
  ProfileImportResult,
  ProfileStoreActions,
  ProfileStoreState,
  UpdateProfileRequest,
} from '../types/profile';
import { DEFAULT_PROFILE_CONFIG } from '../types/profile';

/**
 * Combined store type.
 */
type ProfileStore = ProfileStoreState & ProfileStoreActions;

/**
 * Merge settings with defaults.
 * Priority: Profile settings → Backend defaults → Hardcoded defaults
 */
function mergeWithDefaults(
  config: ProfileConfig | undefined,
  backendDefaults: ProfileConfig | null,
): ProfileConfig {
  const hardcodedDefaults = DEFAULT_PROFILE_CONFIG;

  return {
    general: {
      ...hardcodedDefaults.general,
      ...backendDefaults?.general,
      ...config?.general,
    },
    tests: {
      ...hardcodedDefaults.tests,
      ...backendDefaults?.tests,
      ...config?.tests,
    },
    interfaces: {
      ...hardcodedDefaults.interfaces,
      ...backendDefaults?.interfaces,
      ...config?.interfaces,
    },
    thresholds: {
      ...hardcodedDefaults.thresholds,
      ...backendDefaults?.thresholds,
      ...config?.thresholds,
    },
    display: {
      ...hardcodedDefaults.display,
      ...backendDefaults?.display,
      ...config?.display,
    },
  };
}

/**
 * Profile store with Zustand.
 */
export const useProfileStore = create<ProfileStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        profiles: [],
        activeProfile: null,
        backendDefaults: null,
        isLoading: false,
        error: null,

        // Actions
        loadProfiles: async () => {
          set({ isLoading: true, error: null });
          try {
            const [profiles, backendDefaults] = await Promise.all([
              profileApi.list(),
              profileApi.getDefaults().catch(() => null),
            ]);

            // Convert list items to full profiles (we may need to fetch individually)
            set({
              profiles: profiles as unknown as Profile[],
              backendDefaults,
              isLoading: false,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load profiles',
              isLoading: false,
            });
          }
        },

        loadActiveProfile: async () => {
          set({ isLoading: true, error: null });
          try {
            const activeProfile = await profileApi.getActive();
            const { backendDefaults } = get();

            // Merge with defaults
            const mergedConfig = mergeWithDefaults(activeProfile.config, backendDefaults);

            set({
              activeProfile: { ...activeProfile, config: mergedConfig },
              isLoading: false,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load active profile',
              isLoading: false,
            });
          }
        },

        switchProfile: async (profileId: string) => {
          set({ isLoading: true, error: null });
          try {
            const profile = await profileApi.switchTo(profileId);
            const { backendDefaults } = get();

            // Merge with defaults
            const mergedConfig = mergeWithDefaults(profile.config, backendDefaults);

            set({
              activeProfile: { ...profile, config: mergedConfig },
              isLoading: false,
            });
            return true;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to switch profile',
              isLoading: false,
            });
            return false;
          }
        },

        createProfile: async (request: CreateProfileRequest) => {
          set({ isLoading: true, error: null });
          try {
            const profile = await profileApi.create(request);
            const { profiles } = get();

            set({
              profiles: [...profiles, profile],
              isLoading: false,
            });
            return profile;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to create profile',
              isLoading: false,
            });
            throw error;
          }
        },

        updateProfile: async (id: string, request: UpdateProfileRequest) => {
          set({ isLoading: true, error: null });
          try {
            const profile = await profileApi.update(id, request);
            const { profiles, activeProfile, backendDefaults } = get();

            // Update in profiles list
            const updatedProfiles = profiles.map((p) => (p.id === id ? profile : p));

            // Update active profile if it's the one being updated
            let updatedActiveProfile = activeProfile;
            if (activeProfile?.id === id) {
              const mergedConfig = mergeWithDefaults(profile.config, backendDefaults);
              updatedActiveProfile = { ...profile, config: mergedConfig };
            }

            set({
              profiles: updatedProfiles,
              activeProfile: updatedActiveProfile,
              isLoading: false,
            });
            return profile;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update profile',
              isLoading: false,
            });
            throw error;
          }
        },

        deleteProfile: async (id: string) => {
          set({ isLoading: true, error: null });
          try {
            await profileApi.delete(id);
            const { profiles, activeProfile } = get();

            set({
              profiles: profiles.filter((p) => p.id !== id),
              // Clear active profile if it was deleted
              activeProfile: activeProfile?.id === id ? null : activeProfile,
              isLoading: false,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to delete profile',
              isLoading: false,
            });
            throw error;
          }
        },

        duplicateProfile: async (id: string, newName: string) => {
          set({ isLoading: true, error: null });
          try {
            const profile = await profileApi.duplicate(id, newName);
            const { profiles } = get();

            set({
              profiles: [...profiles, profile],
              isLoading: false,
            });
            return profile;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to duplicate profile',
              isLoading: false,
            });
            throw error;
          }
        },

        setDefaultProfile: async (id: string) => {
          set({ isLoading: true, error: null });
          try {
            await profileApi.setDefault(id);
            const { profiles } = get();

            // Update isDefault flag in profiles
            const updatedProfiles = profiles.map((p) => ({
              ...p,
              isDefault: p.id === id,
            }));

            set({
              profiles: updatedProfiles,
              isLoading: false,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to set default profile',
              isLoading: false,
            });
            throw error;
          }
        },

        updateSettings: async <K extends keyof ProfileConfig>(
          category: K,
          settings: ProfileConfig[K],
        ) => {
          const { activeProfile } = get();
          if (!activeProfile) {
            set({ error: 'No active profile' });
            return;
          }

          // Optimistic update
          const updatedConfig = {
            ...activeProfile.config,
            [category]: {
              ...activeProfile.config[category],
              ...settings,
            },
          };

          set({
            activeProfile: { ...activeProfile, config: updatedConfig },
          });

          try {
            await profileApi.update(activeProfile.id, {
              config: { [category]: settings },
            });
          } catch (error) {
            // Revert on error
            set({
              activeProfile,
              error: error instanceof Error ? error.message : 'Failed to update settings',
            });
          }
        },

        exportProfiles: async (): Promise<ProfileExport> => {
          set({ isLoading: true, error: null });
          try {
            const data = await profileApi.exportAll();
            set({ isLoading: false });
            return data;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to export profiles',
              isLoading: false,
            });
            throw error;
          }
        },

        importProfiles: async (data: ProfileImportRequest): Promise<ProfileImportResult> => {
          set({ isLoading: true, error: null });
          try {
            const result = await profileApi.import(data);

            // Reload profiles after import
            await get().loadProfiles();

            set({ isLoading: false });
            return result;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to import profiles',
              isLoading: false,
            });
            throw error;
          }
        },
      }),
      {
        name: 'stem-profile-store',
        // Only persist the active profile ID, not the full data
        partialize: (state) => ({
          activeProfileId: state.activeProfile?.id,
        }),
      },
    ),
    { name: 'ProfileStore' },
  ),
);

/**
 * Selector for getting effective settings (merged with defaults).
 */
export function useEffectiveSettings(): ProfileConfig {
  const { activeProfile, backendDefaults } = useProfileStore();
  return mergeWithDefaults(activeProfile?.config, backendDefaults);
}

/**
 * Selector for specific settings category.
 */
export function useSettingsCategory<K extends keyof ProfileConfig>(category: K): ProfileConfig[K] {
  const settings = useEffectiveSettings();
  return settings[category];
}

export default useProfileStore;
