import { createClient } from './lib/supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    const supabaseUrlEl = document.getElementById('supabaseUrl');
    const supabaseKeyEl = document.getElementById('supabaseKey');
    const emailEl = document.getElementById('email');
    const passwordEl = document.getElementById('password');
    const saveBtn = document.getElementById('saveBtn');
    const statusMsg = document.getElementById('statusMsg');

    // Load existing data
    chrome.storage.local.get(['supabaseUrl', 'supabaseKey', 'email', 'password'], (data) => {
        if (data.supabaseUrl) supabaseUrlEl.value = data.supabaseUrl;
        if (data.supabaseKey) supabaseKeyEl.value = data.supabaseKey;
        if (data.email) emailEl.value = data.email;
        if (data.password) passwordEl.value = data.password;
    });

    const showStatus = (msg, isError = false) => {
        statusMsg.textContent = msg;
        statusMsg.className = `status ${isError ? 'error' : 'success'}`;
        statusMsg.style.display = 'block';
    };

    saveBtn.addEventListener('click', async () => {
        const supabaseUrl = supabaseUrlEl.value.trim();
        const supabaseKey = supabaseKeyEl.value.trim();
        const email = emailEl.value.trim();
        const password = passwordEl.value.trim();

        if (!supabaseUrl || !supabaseKey || !email || !password) {
            showStatus('الرجاء تعبئة جميع الحقول', true);
            return;
        }

        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'جاري الاتصال...';

            // Test Connection and Login
            const supabaseClient = createClient(supabaseUrl, supabaseKey);
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                throw error;
            }

            // Save to Chrome Storage
            chrome.storage.local.set(
                { supabaseUrl, supabaseKey, email, password, session: data.session },
                () => {
                    showStatus('تم الاتصال بنجاح! ✅', false);
                    // Tell background script to reload Supabase client
                    chrome.runtime.sendMessage({ type: "INIT_SUPABASE" });
                }
            );
        } catch (err) {
            showStatus(`فشل الاتصال: ${err.message}`, true);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'حفظ وتسجيل الدخول';
        }
    });
});
