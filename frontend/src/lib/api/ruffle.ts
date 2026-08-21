import { apiClient } from './client';

export type RuffleChannel = 'stable' | 'nightly';

export interface RuffleUpdateCheck {
  currentVersion: string | null;
  installedChannel: RuffleChannel | null;
  channel: RuffleChannel;
  latestVersion: string;
  updateAvailable: boolean;
  channelSwitch: boolean;
  changelog?: string;
  publishedAt?: string;
}

export const ruffleApi = {
  getVersion: async (): Promise<{
    currentVersion: string | null;
    isInstalled: boolean;
    installedChannel: RuffleChannel | null;
    channel: RuffleChannel;
  }> => {
    const { data } = await apiClient.get('/ruffle/version');
    return data;
  },

  checkUpdate: async (): Promise<RuffleUpdateCheck> => {
    const { data } = await apiClient.get('/ruffle/check-update');
    return data;
  },

  setChannel: async (channel: RuffleChannel): Promise<RuffleUpdateCheck> => {
    const { data } = await apiClient.put('/ruffle/channel', { channel });
    return data;
  },

  update: async (): Promise<{
    success: boolean;
    version: string;
    channel: RuffleChannel;
    message: string;
  }> => {
    const { data } = await apiClient.post('/ruffle/update');
    return data;
  },
};
