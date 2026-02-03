import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import axios from 'axios';
import { logger } from '../utils/logger';
import { config } from '../config';

interface ComponentStatus {
  id: string;
  name: string;
  state: 'UP_TO_DATE' | 'UPDATE_AVAILABLE' | 'CHECKING' | 'ERROR';
  currentVersion?: string;
  latestVersion?: string;
}

interface UpdateInfo {
  version: string;
  buildDate: string;
  componentsStatus: ComponentStatus[];
  lastChecked: string;
}

export class UpdateService {
  private readonly flashpointRoot: string;
  private readonly managerPath: string;
  private readonly componentsUrl: string;

  constructor() {
    // Use config to get Flashpoint root path
    this.flashpointRoot = config.flashpointPath;
    this.managerPath = path.join(this.flashpointRoot, 'Manager', 'fpm.exe');
    this.componentsUrl = 'https://nexus-dev.unstable.life/repository/stable/components.xml';
  }

  async checkForUpdates(): Promise<UpdateInfo> {
    logger.info('[UpdateService] Checking for updates...');
    logger.info(`[UpdateService] Flashpoint root: ${this.flashpointRoot}`);

    const componentsStatus: ComponentStatus[] = [];

    try {
      // Check core components
      const coreComponents = [
        { id: 'core-launcher', name: 'Launcher' },
        { id: 'core-manager', name: 'Manager' },
        { id: 'core-database', name: 'Database' },
        { id: 'core-server-legacy', name: 'Legacy Server' },
        { id: 'core-configuration', name: 'Configuration' },
      ];

      // Read components directory to check installed versions
      const componentsDir = path.join(this.flashpointRoot, 'Components');
      logger.info(`[UpdateService] Components directory: ${componentsDir}`);

      for (const component of coreComponents) {
        try {
          // Component files don't have .xml extension in Flashpoint
          const componentPath = path.join(componentsDir, component.id);

          // Check if component file exists
          const exists = await fs
            .access(componentPath)
            .then(() => true)
            .catch(() => false);

          if (exists) {
            // Read component file - first line contains hash, size, and dependencies
            const content = await fs.readFile(componentPath, 'utf-8');
            const firstLine = content.split('\n')[0];
            const parts = firstLine.trim().split(' ');

            // First part is hash (can be used as version identifier)
            const hash = parts[0] || 'unknown';
            const currentVersion = hash.substring(0, 8); // Use first 8 chars of hash as version

            logger.info(`[UpdateService] Component ${component.id}: ${currentVersion}`);

            componentsStatus.push({
              id: component.id,
              name: component.name,
              state: 'UP_TO_DATE',
              currentVersion,
            });
          } else {
            logger.warn(`[UpdateService] Component file not found: ${componentPath}`);
            componentsStatus.push({
              id: component.id,
              name: component.name,
              state: 'ERROR',
            });
          }
        } catch (error) {
          logger.error(`[UpdateService] Error checking component ${component.id}:`, error);
          componentsStatus.push({
            id: component.id,
            name: component.name,
            state: 'ERROR',
          });
        }
      }

      // Check remote versions (simplified - in real implementation, parse components.xml)
      try {
        await axios.get(this.componentsUrl, { timeout: 5000 });
        // Parse XML and compare versions (simplified for now)
        logger.info('[UpdateService] Successfully fetched remote component list');
      } catch (error) {
        logger.warn('[UpdateService] Could not fetch remote component list:', error);
      }
    } catch (error) {
      logger.error('[UpdateService] Error during update check:', error);
    }

    // Read web app version from package.json
    const packagePath = path.join(__dirname, '../../package.json');
    let version = '1.0.0';
    let buildDate = 'Unknown';

    try {
      const packageContent = await fs.readFile(packagePath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      version = packageJson.version || '1.0.0';
    } catch (error) {
      logger.warn('[UpdateService] Could not read package.json:', error);
    }

    // Try to read build date from Launcher config
    try {
      const configPath = path.join(this.flashpointRoot, 'Launcher', 'config.json');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      buildDate = config.buildDate || 'Unknown';
    } catch (error) {
      logger.warn('[UpdateService] Could not read build date:', error);
    }

    return {
      version,
      buildDate,
      componentsStatus,
      lastChecked: new Date().toISOString(),
    };
  }

  async installUpdates(): Promise<{ success: boolean; message: string }> {
    logger.info('[UpdateService] Installing updates...');

    try {
      // Check if Flashpoint Manager exists
      const managerExists = await fs
        .access(this.managerPath)
        .then(() => true)
        .catch(() => false);

      if (!managerExists) {
        logger.warn('[UpdateService] Flashpoint Manager not found at:', this.managerPath);
        return {
          success: false,
          message: 'Flashpoint Manager not found. Please update manually.',
        };
      }

      // Run Flashpoint Manager to update components
      return new Promise((resolve, reject) => {
        const fpm = spawn(this.managerPath, ['update'], {
          cwd: path.join(this.flashpointRoot, 'Manager'),
          windowsHide: true,
        });

        let errorOutput = '';

        fpm.stdout?.on('data', (data) => {
          logger.info('[UpdateService] FPM Output:', data.toString());
        });

        fpm.stderr?.on('data', (data) => {
          errorOutput += data.toString();
          logger.error('[UpdateService] FPM Error:', data.toString());
        });

        fpm.on('close', (code) => {
          if (code === 0) {
            logger.info('[UpdateService] Updates installed successfully');
            resolve({
              success: true,
              message: 'Updates installed successfully. Please restart the application.',
            });
          } else {
            logger.error('[UpdateService] Update failed with code:', code);
            resolve({
              success: false,
              message: `Update failed: ${errorOutput || 'Unknown error'}`,
            });
          }
        });

        fpm.on('error', (error) => {
          logger.error('[UpdateService] Failed to start FPM:', error);
          reject(error);
        });

        // Timeout after 5 minutes
        setTimeout(
          () => {
            fpm.kill();
            reject(new Error('Update process timed out'));
          },
          5 * 60 * 1000
        );
      });
    } catch (error) {
      logger.error('[UpdateService] Error during update installation:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to install updates',
      };
    }
  }

  async getSystemInfo(): Promise<{
    flashpointRoot: string;
    managerPath: string;
    managerExists: boolean;
  }> {
    const managerExists = await fs
      .access(this.managerPath)
      .then(() => true)
      .catch(() => false);

    return {
      flashpointRoot: this.flashpointRoot,
      managerPath: this.managerPath,
      managerExists,
    };
  }
}

export const updateService = new UpdateService();
