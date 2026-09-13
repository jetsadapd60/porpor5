<script>
  import { supabase } from '../supabase.js';
  import { auth } from '../auth.svelte.js';

  let academicYear = $state(new Date().getFullYear() + 543);
  let semester = $state('1');
  let subjectCode = $state('');
  let subjectName = $state('');
  let gradeLevel = $state('');
  let room = $state('');
  let teacherName = $state('');
  let file = $state(null);

  let uploading = $state(false);
  let error = $state(null);
  let success = $state(false);

  async function handleUpload() {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      error = "ไฟล์ขนาดเกิน 5MB";
      return;
    }

    uploading = true;
    error = null;
    success = false;

    try {
      // 1. รับ JWT Token จาก Supabase Auth เพื่อยืนยันตัวตนกับ Edge Function
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) throw new Error("ไม่พบข้อมูลการล็อกอิน");

      // 2. เตรียมข้อมูลสำหรับส่งไปที่ Edge Function
      const formData = new FormData();
      formData.append('file', file);
      formData.append('year', String(academicYear));
      formData.append('grade', gradeLevel);
      formData.append('room', room);

      // 3. เรียกใช้งาน Edge Function
      const edgeFunctionUrl = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/upload-to-drive';
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "อัปโหลดไฟล์ไม่สำเร็จ โปรดตรวจสอบการตั้งค่า Service Account");

      // 4. บันทึก Metadata ลงฐานข้อมูล (Supabase)
      const { error: dbError } = await supabase
        .from('porpor5_documents')
        .insert([{
          academic_year: String(academicYear),
          semester,
          subject_code: subjectCode,
          subject_name: subjectName,
          grade_level: gradeLevel,
          room,
          teacher_name: teacherName,
          drive_file_id: result.file_id,
          drive_file_url: result.file_url,
          uploader_uid: auth.user.id,
          uploader_email: auth.user.email
        }]);
        
      if (dbError) throw dbError;

      // เคลียร์ฟอร์มเมื่อสำเร็จ
      success = true;
      subjectCode = '';
      subjectName = '';
      gradeLevel = '';
      room = '';
      file = null;
      document.getElementById('file-input').value = '';

    } catch (err) {
      console.error(err);
      error = err.message;
    } finally {
      uploading = false;
    }
  }
</script>

<div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full max-w-2xl mx-auto">
  <h2 class="text-2xl font-bold mb-6 text-gray-800">อัปโหลดไฟล์ ปพ.5</h2>

  {#if error}
    <div class="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100 flex items-start">
      <svg class="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      {error}
    </div>
  {/if}

  {#if success}
    <div class="bg-green-50 text-green-700 p-4 rounded-xl mb-6 border border-green-100 flex items-start">
      <svg class="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      อัปโหลดไฟล์และบันทึกข้อมูลสำเร็จ!
    </div>
  {/if}

  <form onsubmit={(e) => { e.preventDefault(); handleUpload(); }} class="space-y-5">
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1.5">ปีการศึกษา</label>
        <input type="text" bind:value={academicYear} required class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="เช่น 2569">
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1.5">ภาคเรียน</label>
        <select bind:value={semester} required class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all">
          <option value="1">1</option>
          <option value="2">2</option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1.5">รหัสวิชา</label>
        <input type="text" bind:value={subjectCode} required class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="เช่น ว21101">
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1.5">ชื่อวิชา</label>
        <input type="text" bind:value={subjectName} required class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="เช่น วิทยาศาสตร์พื้นฐาน">
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1.5">ระดับชั้น</label>
        <input type="text" bind:value={gradeLevel} required class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="เช่น ม.1">
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-1.5">ห้องเรียน</label>
        <input type="text" bind:value={room} required class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="เช่น ม.1/1">
      </div>
    </div>

    <div>
      <label class="block text-sm font-semibold text-gray-700 mb-1.5">ชื่อครูผู้สอน</label>
      <input type="text" bind:value={teacherName} required class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="ระบุชื่อ-นามสกุล">
    </div>

    <div>
      <label class="block text-sm font-semibold text-gray-700 mb-1.5">ไฟล์ ปพ.5 (PDF เท่านั้น, ไม่เกิน 5MB)</label>
      <div class="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:bg-gray-50 transition-colors">
        <div class="space-y-1 text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <div class="flex text-sm text-gray-600 justify-center">
            <label for="file-input" class="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
              <span>อัปโหลดไฟล์</span>
              <input id="file-input" name="file-input" type="file" accept=".pdf" required onchange={(e) => file = e.target.files[0]} class="sr-only">
            </label>
            <p class="pl-1">หรือลากไฟล์มาวาง</p>
          </div>
          <p class="text-xs text-gray-500">
            {file ? `เลือกไฟล์แล้ว: ${file.name}` : 'PDF ขนาดสูงสุด 5MB'}
          </p>
        </div>
      </div>
    </div>

    <div class="pt-2">
      <button type="submit" disabled={uploading || !file} class="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
        {#if uploading}
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          กำลังอัปโหลด...
        {:else}
          อัปโหลดไฟล์
        {/if}
      </button>
    </div>

  </form>
</div>
