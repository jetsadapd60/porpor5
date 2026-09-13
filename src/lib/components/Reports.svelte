<script>
  import { supabase } from '../supabase.js';
  import { onMount } from 'svelte';

  let documents = $state([]);
  let loading = $state(true);
  
  // Grouping structures
  let groupedBySemester = $state({});
  let totalDocs = $state(0);

  async function fetchAllDocuments() {
    loading = true;
    try {
      const { data, error } = await supabase
        .from('porpor5_documents')
        .select('*')
        .order('academic_year', { ascending: false })
        .order('semester', { ascending: false });
      
      if (error) throw error;
      documents = data || [];
      totalDocs = documents.length;

      const groups = {};
      documents.forEach(doc => {
        const termKey = `ปีการศึกษา ${doc.academic_year} ภาคเรียนที่ ${doc.semester}`;
        if (!groups[termKey]) {
          groups[termKey] = {
            total: 0,
            byGrade: {},
            bySubject: {}
          };
        }
        
        groups[termKey].total += 1;
        
        // Group by grade
        if (!groups[termKey].byGrade[doc.grade_level]) {
          groups[termKey].byGrade[doc.grade_level] = 0;
        }
        groups[termKey].byGrade[doc.grade_level] += 1;

        // Group by subject
        const subjectKey = `${doc.subject_code} ${doc.subject_name}`;
        if (!groups[termKey].bySubject[subjectKey]) {
          groups[termKey].bySubject[subjectKey] = 0;
        }
        groups[termKey].bySubject[subjectKey] += 1;
      });
      
      groupedBySemester = groups;
    } catch (error) {
      console.error('Error fetching documents for report:', error);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchAllDocuments();
  });
</script>

<div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden p-6 mb-6">
  <div class="flex items-center gap-4 mb-6">
    <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
    </div>
    <div>
      <h2 class="text-2xl font-bold text-gray-800">รายงานสรุปภาพรวม</h2>
      <p class="text-gray-500">จำนวนไฟล์ ปพ.5 ทั้งหมดในระบบ: <span class="font-bold text-blue-600">{totalDocs}</span> ไฟล์</p>
    </div>
  </div>

  {#if loading}
    <div class="py-12 text-center text-gray-500">กำลังโหลดข้อมูลสรุป...</div>
  {:else if Object.keys(groupedBySemester).length === 0}
    <div class="py-12 text-center text-gray-500">ยังไม่มีข้อมูลในระบบ</div>
  {:else}
    <div class="space-y-8">
      {#each Object.entries(groupedBySemester) as [term, data]}
        <div class="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          <div class="bg-gray-50 px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 class="font-bold text-gray-800 text-lg">{term}</h3>
            <span class="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
              รวม {data.total} ไฟล์
            </span>
          </div>
          <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- By Grade -->
            <div>
              <h4 class="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">สรุปตามระดับชั้น</h4>
              <ul class="space-y-2">
                {#each Object.entries(data.byGrade).sort() as [grade, count]}
                  <li class="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                    <span class="text-gray-700">{grade}</span>
                    <span class="font-medium text-gray-900">{count}</span>
                  </li>
                {/each}
              </ul>
            </div>
            <!-- By Subject -->
            <div>
              <h4 class="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">สรุปตามรายวิชา</h4>
              <ul class="space-y-2">
                {#each Object.entries(data.bySubject).sort() as [subject, count]}
                  <li class="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                    <span class="text-gray-700">{subject}</span>
                    <span class="font-medium text-gray-900">{count}</span>
                  </li>
                {/each}
              </ul>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
