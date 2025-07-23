// --- Config ---
const ADMIN_PASSWORD = '4997'; // 这是您的后台登录密码
const SUPABASE_URL = 'https://cgkkwbsmlmmepxzmhcyi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNna2t3YnNtbG1tZXB4em1oY3lpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTc5NDksImV4cCI6MjA2ODgzMzk0OX0.RMjEd6ge8Kl09W-MM_cIg23lqM7g6sFib2QUVp7LUsU';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM Elements ---
const loginSection = document.getElementById('login-section');
const adminSection = document.getElementById('admin-section');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const uploadForm = document.getElementById('upload-form');
const uploadStatus = document.getElementById('upload-status');
const uploadButton = document.getElementById('upload-button');
const logoutButton = document.getElementById('logout-button');

// --- Functions ---

function showAdminPage() {
    loginSection.style.display = 'none';
    adminSection.style.display = 'block';
}

function showLoginPage() {
    loginSection.style.display = 'block';
    adminSection.style.display = 'none';
    sessionStorage.removeItem('isAdmin');
}

async function handleUpload(e) {
    e.preventDefault();

    const category = uploadForm.category.value.trim();
    const file = uploadForm['pdf-file'].files[0];

    if (!category || !file) {
        uploadStatus.textContent = '请填写所有字段。';
        uploadStatus.style.color = 'orange';
        return;
    }

    uploadButton.disabled = true;
    uploadStatus.textContent = '正在上传文件，请稍候...';
    uploadStatus.style.color = 'white';

    try {
        const originalFileName = file.name;
        const fileExtension = originalFileName.split('.').pop();
        const newFileName = `${crypto.randomUUID()}.${fileExtension}`;

        // 1. Upload file to Storage with the new safe name
        const filePath = `${category}/${newFileName}`;
        const { error: uploadError } = await supabaseClient.storage
            .from('pdf-files')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false, // No need to upsert, names are unique
            });

        if (uploadError) throw uploadError;

        // 2. Get public URL of the uploaded file
        const { data: urlData } = supabaseClient.storage
            .from('pdf-files')
            .getPublicUrl(filePath);

        const publicURL = urlData.publicUrl;

        // 3. Insert file metadata into the database, storing the ORIGINAL filename for display
        const { error: dbError } = await supabaseClient
            .from('pdfs')
            .insert({
                file_name: originalFileName, // Use the original name for display
                category: category,
                public_url: publicURL,
            });

        if (dbError) throw dbError;

        uploadStatus.textContent = `文件 "${originalFileName}" 上传成功！`;
        uploadStatus.style.color = 'green';
        uploadForm.reset();

    } catch (error) {
        console.error('Upload failed:', error);
        uploadStatus.textContent = `上传失败: ${error.message}`;
        uploadStatus.style.color = 'red';
    } finally {
        uploadButton.disabled = false;
    }
}


// --- Event Listeners ---

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = loginForm.password.value;
    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('isAdmin', 'true');
        showAdminPage();
        loginError.textContent = '';
    } else {
        loginError.textContent = '密码错误，请重试。';
    }
    loginForm.reset();
});

uploadForm.addEventListener('submit', handleUpload);

logoutButton.addEventListener('click', showLoginPage);


// --- Initial Check ---
// Check if user is already logged in from a previous session
if (sessionStorage.getItem('isAdmin') === 'true') {
    showAdminPage();
} 