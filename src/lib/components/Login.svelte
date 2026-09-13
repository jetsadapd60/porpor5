<script>
  import { auth } from '../auth.svelte.js';
  
  let isLoading = $state(false);
  let errorMessage = $state('');

  async function handleLogin() {
    try {
      isLoading = true;
      errorMessage = '';
      await auth.signInWithGoogle();
    } catch (error) {
      errorMessage = error.message;
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
  <div class="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center border border-gray-100">
    <div class="mb-8">
      <img src="/logo.jpg" alt="porpor5 logo" class="w-24 h-24 object-contain mx-auto mb-4 rounded-2xl shadow-sm border border-gray-100" />
      <h1 class="text-3xl font-bold text-gray-800 mb-2 tracking-tight">porpor5</h1>
      <p class="text-gray-500">กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ</p>
    </div>
    
    {#if errorMessage}
      <div class="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm text-left border border-red-100">
        <span class="font-semibold block mb-1">เกิดข้อผิดพลาด:</span>
        {errorMessage}
      </div>
    {/if}

    <button 
      onclick={handleLogin}
      disabled={isLoading}
      class="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 rounded-2xl px-6 py-3.5 text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all focus:ring-4 focus:ring-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {#if isLoading}
        <div class="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
        <span>กำลังดำเนินการ...</span>
      {:else}
        <svg class="w-5 h-5" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        <span>เข้าสู่ระบบด้วย Google</span>
      {/if}
    </button>
  </div>
</div>
