import { motion, Variants } from 'framer-motion';
import { useAuthStore } from '@/store/auth';
import { MetadataUpdateCard } from './MetadataUpdateCard';
import { RuffleManagementCard } from './RuffleManagementCard';

interface UpdateSettingsTabProps {
  tabContentVariants: Variants;
}

export function UpdateSettingsTab({ tabContentVariants }: UpdateSettingsTabProps) {
  const { user } = useAuthStore();
  const isAdmin = user?.permissions.includes('settings.update');

  return (
    <motion.div
      key="update"
      variants={tabContentVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      {/* Game Metadata Updates Section (Admin Only) */}
      {isAdmin ? <MetadataUpdateCard /> : null}

      {/* Ruffle Emulator Management (Admin Only) */}
      {isAdmin ? <RuffleManagementCard /> : null}
    </motion.div>
  );
}
