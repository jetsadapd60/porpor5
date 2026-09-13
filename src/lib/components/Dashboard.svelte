<script>
  import { auth } from '../auth.svelte.js';
  import { supabase } from '../supabase.js';
  import UploadForm from './UploadForm.svelte';
  import { onMount } from 'svelte';

  let showUploadForm = $state(false);
  let documents = $state([]);
  let loading = $state(true);

  async function fetchDocuments() {
    loading = true;
    try {
      const { data, error } = await supabase
        .from('porpor5_documents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      documents = data || [];
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchDocuments();
  });
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
  <nav class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16 items-center">
        <div class="flex-shrink-0 flex items-center gap-3">
          <div class="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span class="text-xl font-bold text-gray-800 tracking-tight">ระบบจัดเก็บ ปพ.5</span>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-3 border-r border-gray-200 pr-4">
            <div class="flex flex-col items-end hidden sm:flex">
              <span class="text-sm font-semibold text-gray-700">{auth.user?.user_metadata?.full_name || auth.user?.email?.split('@')[0]}</span>
              <span class="text-xs text-gray-500">{auth.user?.email}</span>
            </div>
            {#if auth.user?.user_metadata?.avatar_url}
              <img src={auth.user.user_metadata.avatar_url} alt="Profile" class="w-9 h-9 rounded-full border border-gray-200 shadow-sm">
            {:else}
              <div class="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                {auth.user?.email?.charAt(0).toUpperCase()}
              </div>
            {/if}
          </div>
          <button 
            onclick={() => auth.signOut()}
            class="text-sm text-gray-600 hover:text-red-600 font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  </nav>

  <main class="flex-grow max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 w-full">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-800">
        {showUploadForm ? 'อัปโหลดไฟล์ใหม่' : 'รายการไฟล์ ปพ.5'}
      </h1>
      <button 
        onclick={() => { showUploadForm = !showUploadForm; if(!showUploadForm) fetchDocuments(); }}
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm"
      >
        {showUploadForm ? 'กลับหน้ารวม' : '+ อัปโหลดไฟล์'}
      </button>
    </div>

    {#if showUploadForm}
      <UploadForm />
    {:else}
      <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ปีการศึกษา/เทอม</th>
                <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">วิชา</th>
                <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ชั้น/ห้อง</th>
                <th scope="col" class="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ครูผู้สอน</th>
                <th scope="col" class="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">จัดการ</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              {#if loading}
                <tr><td colspan="5" class="px-6 py-12 text-center text-gray-500">กำลังโหลดข้อมูล...</td></tr>
              {:else if documents.length === 0}
                <tr><td colspan="5" class="px-6 py-12 text-center text-gray-500">ยังไม่มีข้อมูลไฟล์ ปพ.5</td></tr>
              {:else}
                {#each documents as doc (doc.id)}
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{doc.academic_year} / {doc.semester}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm font-semibold text-gray-900">{doc.subject_name}</div>
                      <div class="text-sm text-gray-500">{doc.subject_code}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{doc.grade_level} ห้อง {doc.room}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.teacher_name}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a href={doc.drive_file_url} target="_blank" class="text-blue-600 hover:text-blue-900 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors inline-flex items-center gap-1.5">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        เปิดดู
                      </a>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  </main>
</div>
