import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. ตรวจสอบสิทธิ์การเข้าถึง (Supabase Auth)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    // 2. ดึงข้อมูลจาก FormData
    const formData = await req.formData()
    const file = formData.get('file') as File
    const year = formData.get('year') as string
    const grade = formData.get('grade') as string
    const room = formData.get('room') as string
    const rootFolderId = Deno.env.get('GOOGLE_DRIVE_ROOT_FOLDER_ID')

    if (!file || !year || !grade || !room || !rootFolderId) {
      throw new Error('Missing required fields')
    }

    // 3. ขอ Access Token ใหม่จาก Refresh Token
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN')

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Missing Google OAuth Secrets (Client ID, Secret, or Refresh Token)')
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      })
    })
    
    const tokenData = await tokenResponse.json()
    if (tokenData.error) throw new Error(`Google Auth Error: ${tokenData.error_description || tokenData.error}`)
    const access_token = tokenData.access_token

    // Helper: สร้างหรือดึง Folder ID
    const getOrCreateFolder = async (name: string, parentId: string) => {
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`, {
        headers: { Authorization: `Bearer ${access_token}` }
      })
      const searchData = await searchRes.json()
      if (searchData.files && searchData.files.length > 0) return searchData.files[0].id

      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parents: [parentId], mimeType: 'application/vnd.google-apps.folder' })
      })
      const createData = await createRes.json()
      return createData.id
    }

    // 4. จัดการโครงสร้าง Folder (ปีการศึกษา > ระดับชั้น > ห้อง)
    const yearFolderId = await getOrCreateFolder(year, rootFolderId)
    const gradeFolderId = await getOrCreateFolder(grade, yearFolderId)
    const roomFolderId = await getOrCreateFolder(room, gradeFolderId)

    // 5. อัปโหลดไฟล์ไปยัง Folder ที่กำหนด
    const metadata = { name: file.name, parents: [roomFolderId] }
    const fileBody = new FormData()
    fileBody.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    fileBody.append('file', file)

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}` },
      body: fileBody
    })
    const uploadData = await uploadRes.json()
    if (uploadData.error) throw new Error(uploadData.error.message)

    // 6. ตั้งค่าสิทธิ์ให้สามารถเปิดดูผ่านลิงก์ได้
    await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' })
    })

    // 7. ส่งคืนข้อมูลกลับไปยัง Frontend
    return new Response(JSON.stringify({ 
      file_id: uploadData.id, 
      file_url: uploadData.webViewLink 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
