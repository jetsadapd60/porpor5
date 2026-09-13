import { supabase } from './supabase.js';

class AuthState {
  user = $state(null);
  session = $state(null);
  initialized = $state(false);

  constructor() {
    this.init();
  }

  async init() {
    // Get initial session
    const { data: { session } } = await supabase.auth.getSession();
    this.session = session;
    this.user = session?.user || null;
    this.initialized = true;

    // Listen for auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      this.session = session;
      this.user = session?.user || null;
    });
  }

  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Redirect back to the main page after login
        redirectTo: window.location.origin
      }
    });
    
    if (error) {
      console.error('Error logging in with Google:', error.message);
      throw error;
    }
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
      throw error;
    }
  }
}

// Export a singleton instance
export const auth = new AuthState();
