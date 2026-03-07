import { createClient } from './lib/supabase.js';

let supabaseClient = null;
let currentUserId = null;

// Initialize Supabase from storage
async function initSupabase() {
    const { supabaseUrl, supabaseKey, email, password } = await chrome.storage.local.get([
        'supabaseUrl',
        'supabaseKey',
        'email',
        'password'
    ]);

    if (supabaseUrl && supabaseKey) {
        supabaseClient = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: false,
            }
        });

        if (email && password) {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password,
            });
            if (data && data.user) {
                currentUserId = data.user.id;
                console.log("Supabase initialized in background script, user:", currentUserId);
                return true;
            } else {
                console.error("Auth error in background script:", error);
            }
        }
    }
    return false;
}

// Ensure init on startup
initSupabase();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "INIT_SUPABASE") {
        initSupabase().then(success => sendResponse({ status: success }));
        return true; // Keep channel open
    }
});

// Setup Context Menu
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "save-favorite",
        title: "حفظ في مدير المفضلات",
        contexts: ["selection", "link", "image", "page"]
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "save-favorite") {

        // Ensure initialized
        if (!supabaseClient || !currentUserId) {
            const isInit = await initSupabase();
            if (!isInit) {
                showNotification("خطأ تسجيل دخول", "الرجاء فتح إضافة المتصفح إدخال بيانات الدخول");
                return;
            }
        }

        let type = 'text';
        let content = '';
        let url = info.pageUrl;
        let title = tab.title || "مفردة جديدة";
        let thumbnail = '';

        if (info.selectionText) {
            content = info.selectionText;
            type = detectType(content);
        } else if (info.linkUrl) {
            content = info.linkUrl;
            url = info.linkUrl;
            type = detectType(info.linkUrl);
        } else if (info.srcUrl) {  // Image
            content = info.srcUrl;
            url = info.srcUrl;
            thumbnail = info.srcUrl;
            title = "صورة سريعة";
            type = "image";
        } else { // Fallback to page URL
            content = info.pageUrl;
            type = "website";
        }

        try {
            const newFavorite = {
                id: crypto.randomUUID(),
                user_id: currentUserId,
                type: type,
                title: title.slice(0, 100),
                content: content,
                url: url,
                thumbnail: thumbnail,
                tags: [],
                folder_id: null,
                is_pinned: false,
                is_deleted: false,
                deleted_at: null,
                created_at: Date.now(),
                updated_at: Date.now(),
                metadata: {}
            };

            const { error } = await supabaseClient
                .from('favorites')
                .insert([newFavorite]);

            if (error) throw error;

            showNotification("نجاح ✅", "تم حفظ العنصر في مدير المفضلات بنجاح");

        } catch (error) {
            console.error("Save error:", error);
            showNotification("فشل الحفظ ❌", error.message || "حدث خطأ غير معروف");
        }
    }
});

function showNotification(title, message) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: title,
        message: message,
        priority: 2
    });
}

function detectType(content) {
    content = content || '';
    const c = content.toLowerCase();

    if (c.includes('youtube.com/') || c.includes('youtu.be/')) return 'youtube';
    if (c.includes('maps.google.') || c.includes('google.com/maps')) return 'location';
    if (/^05[0-9]{8}$/.test(content.trim()) || /^\\+?[0-9\s-]{9,15}$/.test(content.trim())) return 'phone';
    if (/^https?:\/\//i.test(content) || /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(content.trim())) return 'website';

    return 'text';
}
