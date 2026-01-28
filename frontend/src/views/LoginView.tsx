import { LoginForm } from '../components/auth/LoginForm';
import { ParticleNetworkBackground } from '../components/auth/ParticleNetworkBackground';

/**
 * LoginView - Interactive particle network login page
 * Centered layout with constellation background effect
 * Background: Drifting particles connected by lines, with mouse interaction
 */
export function LoginView() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Interactive Particle Network Background */}
      <ParticleNetworkBackground />

      {/* Centered Login Form Container */}
      <div className="relative z-10 w-full flex items-center justify-center px-4 py-12">
        <LoginForm />
      </div>
    </div>
  );
}
