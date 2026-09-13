<script>
  import { auth } from '../auth.svelte.js';
  import { supabase } from '../supabase.js';
  import UploadForm from './UploadForm.svelte';
  import Reports from './Reports.svelte';
  import { onMount } from 'svelte';

  let currentTab = $state('dashboard');
  let showUploadForm = $state(false);
  let documents = $state([]);
  let loading = $state(true);
  let isAdmin = $state(false);

  let filterYear = $state('');
  let filterSemester = $state('');
  let filterSubject = $state('');
  let filterGrade = $state('');
  let filterTeacher = $state('');

  // Delete Modal State
  let docToDelete = $state(null);
  let deleting = $state(false);

  function promptDelete(doc) {
    docToDelete = doc;
  }
  
  function cancelDelete() {
    docToDelete = null;
  }

  // Edit Modal State
  let editingDoc = $state(null);
  let editAcademicYear = $state('');
  let editSemester = $state('');
  let editSubjectCode = $state('');
  let editSubjectName = $state('');
  let editGradeLevel = $state('');
  let editRoom = $state('');
  let editTeacherName = $state('');
  let updating = $state(false);

  function openEditModal(doc) {
    editingDoc = doc;
    editAcademicYear = doc.academic_year;
    editSemester = doc.semester;
    editSubjectCode = doc.subject_code;
    editSubjectName = doc.subject_name;
    editGradeLevel = doc.grade_level;
    editRoom = doc.room;
    editTeacherName = doc.teacher_name;
  }

  function closeEditModal() {
    editingDoc = null;
  }

  async function saveEdit() {
    updating = true;
    try {
      const { error } = await supabase
        .from('porpor5_documents')
        .update({
          semester: editSemester,
          subject_code: editSubjectCode,
          subject_name: editSubjectName,
          teacher_name: editTeacherName
        })
        .eq('id', editingDoc.id);

      if (error) throw error;
      
      const index = documents.findIndex(d => d.id === editingDoc.id);
      if (index !== -1) {
        documents[index] = {
          ...documents[index],
          semester: editSemester,
          subject_code: editSubjectCode,
          subject_name: editSubjectName,
          teacher_name: editTeacherName
        };
      }
      
      closeEditModal();
    } catch (error) {
      console.error('Error updating document:', error);
      alert('เกิดข้อผิดพลาดในการแก้ไขข้อมูล');
    } finally {
      updating = false;
    }
  }

  async function checkAdminStatus() {
    if (!auth.user) return;
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('email', auth.user.email)
        .single();
      
      if (data && !error) {
        isAdmin = true;
      }
    } catch (e) {
      // Not admin
    }
  }

  async function fetchDocuments() {
    loading = true;
    try {
      let query = supabase
        .from('porpor5_documents')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (filterYear) query = query.eq('academic_year', filterYear);
      if (filterSemester) query = query.eq('semester', filterSemester);
      if (filterSubject) query = query.or(`subject_code.ilike.%${filterSubject}%,subject_name.ilike.%${filterSubject}%`);
      if (filterGrade) query = query.ilike('grade_level', `%${filterGrade}%`);
      if (filterTeacher) query = query.ilike('teacher_name', `%${filterTeacher}%`);

      const { data, error } = await query;
      
      if (error) throw error;
      documents = data || [];
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      loading = false;
    }
  }

  async function confirmDelete() {
    if (!docToDelete) return;
    deleting = true;
    const doc = docToDelete;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      const edgeFunctionUrl = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/delete-from-drive';
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file_id: doc.drive_file_id })
      });

      if (!response.ok) {
        console.warn('Drive delete returned non-ok, proceeding to delete DB record.');
      }

      const { error } = await supabase
        .from('porpor5_documents')
        .delete()
        .eq('id', doc.id);
        
      if (error) throw error;
      
      documents = documents.filter(d => d.id !== doc.id);
      cancelDelete();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('เกิดข้อผิดพลาดในการลบไฟล์');
    } finally {
      deleting = false;
    }
  }

  onMount(() => {
    checkAdminStatus();
    fetchDocuments();
  });
</script>

<div class="min-h-screen bg-gray-50 flex flex-col">
  <nav class="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16 items-center">
        <div class="flex-shrink-0 flex items-center gap-3">
          <img src="/logo.jpg" alt="porpor5 logo" class="w-10 h-10 object-contain rounded-md shadow-sm" />
          <span class="text-xl font-bold text-gray-800 tracking-tight">porpor5</span>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-3 border-r border-gray-200 pr-4">
            <div class="flex flex-col items-end hidden sm:flex">
              <span class="text-sm font-semibold text-gray-700">
                {auth.user?.user_metadata?.full_name || auth.user?.email?.split('@')[0]}
                {#if isAdmin}
                  <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    Admin
                  </span>
                {/if}
              </span>
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
    <!-- Tabs -->
    <div class="mb-6 border-b border-gray-200">
      <nav class="-mb-px flex space-x-8" aria-label="Tabs">
        <button 
          onclick={() => { currentTab = 'dashboard'; showUploadForm = false; fetchDocuments(); }}
          class="{currentTab === 'dashboard' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors"
        >
          รายการไฟล์ ปพ.5
        </button>
        <button 
          onclick={() => { currentTab = 'reports'; showUploadForm = false; }}
          class="{currentTab === 'reports' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors"
        >
          รายงานสรุป
        </button>
      </nav>
    </div>

    {#if currentTab === 'reports'}
      <Reports />
    {:else}
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
      <!-- Filter Bar -->
      <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
        <form onsubmit={(e) => { e.preventDefault(); fetchDocuments(); }} class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 items-end">
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">ปีการศึกษา</label>
            <input type="text" bind:value={filterYear} class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="เช่น 2569">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">ภาคเรียน</label>
            <select bind:value={filterSemester} class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
              <option value="">ทุกภาคเรียน</option>
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="block text-xs font-semibold text-gray-600 mb-1">รหัส/ชื่อวิชา</label>
            <input type="text" bind:value={filterSubject} class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="ค้นหาวิชา">
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">ระดับชั้น</label>
            <input type="text" bind:value={filterGrade} class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="เช่น ม.1">
          </div>
          <div>
            <button type="submit" class="w-full bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm text-sm h-[38px]">
              ค้นหา
            </button>
          </div>
        </form>
      </div>

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
                      <div class="flex justify-end gap-2">
                        <a href={doc.drive_file_url} target="_blank" class="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors inline-flex items-center gap-1.5">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                          เปิดดู
                        </a>
                        {#if isAdmin || doc.uploader_uid === auth.user?.id}
                          <button onclick={() => openEditModal(doc)} class="text-amber-600 hover:text-amber-900 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors inline-flex items-center gap-1.5">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            แก้ไข
                          </button>
                          <button onclick={() => promptDelete(doc)} class="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors inline-flex items-center gap-1.5">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            ลบ
                          </button>
                        {/if}
                      </div>
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
    {/if}
  </main>
</div>

<!-- Edit Modal -->
{#if editingDoc}
  <div class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h3 class="text-lg font-bold text-gray-800">แก้ไขข้อมูลไฟล์ ปพ.5</h3>
        <button onclick={closeEditModal} class="text-gray-400 hover:text-gray-600 transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>
      <div class="p-6">
        <form onsubmit={(e) => { e.preventDefault(); saveEdit(); }} class="space-y-5">
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1.5">ปีการศึกษา</label>
              <input type="text" value={editAcademicYear} disabled class="w-full px-4 py-2.5 bg-gray-100 text-gray-500 border border-gray-200 rounded-xl cursor-not-allowed outline-none">
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1.5">ภาคเรียน</label>
              <select bind:value={editSemester} required class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all">
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1.5">รหัสวิชา</label>
              <input type="text" bind:value={editSubjectCode} required class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all">
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1.5">ชื่อวิชา</label>
              <input type="text" bind:value={editSubjectName} required class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1.5">ระดับชั้น</label>
              <input type="text" value={editGradeLevel} disabled class="w-full px-4 py-2.5 bg-gray-100 text-gray-500 border border-gray-200 rounded-xl cursor-not-allowed outline-none">
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1.5">ห้องเรียน</label>
              <input type="text" value={editRoom} disabled class="w-full px-4 py-2.5 bg-gray-100 text-gray-500 border border-gray-200 rounded-xl cursor-not-allowed outline-none">
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1.5">ชื่อครูผู้สอน</label>
            <input type="text" bind:value={editTeacherName} required class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all">
          </div>

          <div class="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onclick={closeEditModal} class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              ยกเลิก
            </button>
            <button type="submit" disabled={updating} class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed inline-flex items-center">
              {#if updating}
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                กำลังบันทึก...
              {:else}
                บันทึกการแก้ไข
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if docToDelete}
  <div class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
      <div class="p-6 text-center">
        <div class="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <h3 class="text-lg font-bold text-gray-900 mb-2">ยืนยันการลบไฟล์</h3>
        <p class="text-sm text-gray-500 mb-6">คุณต้องการลบไฟล์ ปพ.5 ของวิชา <span class="font-semibold text-gray-800">{docToDelete.subject_name}</span> ใช่หรือไม่? <br><br> <span class="text-red-500 font-medium">คำเตือน:</span> ไฟล์จะถูกลบออกจากระบบและ Google Drive อย่างถาวร ไม่สามารถกู้คืนได้</p>
        
        <div class="flex justify-center gap-3">
          <button type="button" onclick={cancelDelete} disabled={deleting} class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            ยกเลิก
          </button>
          <button type="button" onclick={confirmDelete} disabled={deleting} class="px-5 py-2.5 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 disabled:bg-red-400 inline-flex items-center">
            {#if deleting}
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              กำลังลบ...
            {:else}
              ยืนยันการลบ
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

