<script>
  import { auth } from './lib/auth.svelte.js';
  import Login from './lib/components/Login.svelte';
  import Dashboard from './lib/components/Dashboard.svelte';
</script>

{#if !auth.initialized}
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="flex flex-col items-center gap-4">
      <div class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      <p class="text-gray-500 font-medium">กำลังโหลดข้อมูลระบบ...</p>
    </div>
  </div>
{:else if auth.user}
  <Dashboard />
{:else}
  <Login />
{/if}
