// Backend server URL - Render uchun optimallashtirilgan
const API_BASE_URL = window.location.hostname.includes("localhost") || window.location.hostname.includes("127.0.0.1")
    ? "http://localhost:3001/api" 
    : "/api";

console.log("🚀 API Base URL:", API_BASE_URL);
console.log("🌐 Current hostname:", window.location.hostname);

// Server holatini tekshirish
async function checkServerHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 soniya timeout
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("✅ Server holati:", data);
    return data.success;
  } catch (error) {
    console.error("❌ Serverga ulanib bo'lmadi:", error);
    
    if (error.name === 'AbortError') {
      console.error("⏰ Server javob bermadi (timeout)");
    }
    
    return false;
  }
}

// Google Translate funktsiyasi
function googleTranslateElementInit() {
  try {
    // Translate widget yuklanganligini tekshirish
    if (!window.google || !window.google.translate) {
      console.warn("⚠️ Google Translate hali yuklanmagan");
      setTimeout(googleTranslateElementInit, 1000);
      return;
    }

    new google.translate.TranslateElement(
      {
        pageLanguage: "ru",
        includedLanguages: "ru,en,fr,ko,zh-CN,ja",
        layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false,
      },
      "google_translate_element"
    );
    
    console.log("✅ Google Translate initialized successfully");
    
    // Translate bo'limini avtomatik yopish
    setTimeout(() => {
      const frame = document.querySelector('.goog-te-menu-frame');
      if (frame) {
        frame.style.display = 'none';
      }
    }, 1000);
    
  } catch (error) {
    console.error("❌ Error initializing Google Translate:", error);
  }
}

// Google Translate scriptini yuklash
function loadGoogleTranslate() {
  if (window.google && window.google.translate) {
    googleTranslateElementInit();
    return;
  }

  // Script yuklanganligini tekshirish
  if (document.querySelector('script[src*="translate.google.com"]')) {
    console.log("📜 Google Translate script allaqachon yuklangan");
    return;
  }

  var script = document.createElement("script");
  script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.onerror = function () {
    console.error("❌ Failed to load Google Translate script");
    // Alternative translate function
    initFallbackTranslate();
  };
  
  script.onload = function() {
    console.log("✅ Google Translate script loaded successfully");
  };
  
  document.head.appendChild(script);
}

// Agar Google Translate ishlamasa
function initFallbackTranslate() {
  console.log("🔄 Fallback translate ishlatilmoqda");
  const translateElement = document.getElementById("google_translate_element");
  if (translateElement) {
    translateElement.innerHTML = `
      <div style="padding: 10px; background: #f8f9fa; border-radius: 5px; text-align: center;">
        <small>Перевод временно недоступен</small>
      </div>
    `;
  }
}

// DOM yuklanganida
document.addEventListener("DOMContentLoaded", function () {
  console.log("📄 DOM yuklandi");

  // Google Translate ni yuklash
  loadGoogleTranslate();

  // Elementlarni topish
  const reviewsList = document.getElementById("reviewsList");
  const loadMoreContainer = document.getElementById("loadMoreContainer");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const reviewForm = document.getElementById("reviewForm");
  const reviewSuccess = document.getElementById("reviewSuccess");

  // Elementlar mavjudligini tekshirish
  if (!reviewsList) {
    console.error("❌ reviewsList topilmadi");
    return;
  }

  let visibleCommentsCount = 0;
  const commentsPerPage = 5;
  let allComments = [];

  // Dastlabki kommentlarni yuklash
  fetchComments();

  // Load More tugmasi
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", loadMoreComments);
  } else {
    console.warn("⚠️ loadMoreBtn topilmadi");
  }

  // Serverdan kommentlarni olish
  async function fetchComments() {
    try {
      console.log("📨 Kommentlarni olish...", `${API_BASE_URL}/comments`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(`${API_BASE_URL}/comments`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("📨 Server javobi:", data);

      if (data.success) {
        allComments = data.comments || [];
        console.log(`✅ ${allComments.length} ta komment yuklandi`);
        displayComments(allComments);
      } else {
        throw new Error(data.error || "Server xatosi");
      }
    } catch (error) {
      console.error("❌ Kommentlarni olish xatosi:", error);
      displayComments([]);

      const errorMessage = document.createElement("div");
      errorMessage.className = "empty-menu-message";
      errorMessage.style.display = "block";
      errorMessage.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <p>Не удалось загрузить отзывы. Проверьте подключение к серверу.</p>
        <small style="color: #ff5252; margin-top: 10px; display: block;">${error.message}</small>
        <button onclick="location.reload()" style="margin-top: 10px; padding: 5px 10px; background: #ff5252; color: white; border: none; border-radius: 3px; cursor: pointer;">Обновить страницу</button>
      `;
      reviewsList.appendChild(errorMessage);
    }
  }

  // Kommentlarni ekranga chiqarish
  function displayComments(comments) {
    // Avval barcha eski kommentlarni tozalash
    reviewsList.innerHTML = '';

    visibleCommentsCount = 0;

    if (comments.length === 0) {
      const noComments = document.createElement("div");
      noComments.className = "empty-menu-message";
      noComments.style.display = "block";
      noComments.innerHTML = `
        <i class="fas fa-comment-slash"></i>
        <p>Пока нет отзывов. Будьте первым!</p>
      `;
      reviewsList.appendChild(noComments);
      if (loadMoreContainer) loadMoreContainer.style.display = "none";
      return;
    }

    loadMoreComments(comments);
  }

  // Kommentlarni bosqichma-bosqich yuklash
  function loadMoreComments(comments) {
    if (!comments) {
      comments = allComments;
    }

    const nextComments = comments.slice(
      visibleCommentsCount,
      visibleCommentsCount + commentsPerPage
    );

    nextComments.forEach((comment) => {
      const commentItem = createCommentElement(comment);
      reviewsList.appendChild(commentItem);
    });

    visibleCommentsCount += nextComments.length;

    if (loadMoreContainer) {
      if (visibleCommentsCount >= comments.length) {
        loadMoreContainer.style.display = "none";
      } else {
        loadMoreContainer.style.display = "block";
      }
    }
  }

  // Komment elementini yaratish
  function createCommentElement(comment) {
    const commentItem = document.createElement("div");
    commentItem.className = "review-item notranslate";
    commentItem.dataset.id = comment._id;

    let stars = "";
    for (let i = 0; i < 5; i++) {
      stars += i < comment.rating ? "★" : "☆";
    }

    const isLongText = comment.comment.length > 200;
    const shortText = isLongText
      ? comment.comment.substring(0, 200) + "..."
      : comment.comment;

    const commentDate = new Date(comment.timestamp);
    const formattedDate = commentDate.toLocaleDateString("ru-RU");
    const formattedTime = commentDate.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });

    commentItem.innerHTML = `
      <div class="review-header">
        <span class="reviewer-name">${escapeHtml(comment.name)}</span>
      </div>
      <div class="review-date-container">
        <span class="review-date">${formattedDate}</span>
        <span class="review-date-time">${formattedTime}</span>
      </div>
      <div class="review-rating">${stars}</div>
      <p class="review-text ${isLongText ? "fade" : ""}">${escapeHtml(isLongText ? shortText : comment.comment)}</p>
      ${isLongText ? '<button class="read-more-btn">Читать полностью</button>' : ""}
    `;

    if (isLongText) {
      const readMoreBtn = commentItem.querySelector(".read-more-btn");
      const commentText = commentItem.querySelector(".review-text");

      readMoreBtn.addEventListener("click", function () {
        if (commentText.classList.contains("expanded")) {
          commentText.textContent = escapeHtml(shortText);
          commentText.classList.add("fade");
          readMoreBtn.textContent = "Читать полностью";
          commentText.classList.remove("expanded");
        } else {
          commentText.textContent = escapeHtml(comment.comment);
          commentText.classList.remove("fade");
          readMoreBtn.textContent = "Свернуть";
          commentText.classList.add("expanded");
        }
      });
    }

    return commentItem;
  }

  // XSS hujumlaridan himoya qilish
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Navigatsiya
  const navItems = document.querySelectorAll(".nav-item");
  const contentSections = document.querySelectorAll(".content-section");

  navItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault();

      const targetId = this.getAttribute("data-target");

      navItems.forEach((nav) => nav.classList.remove("active"));
      this.classList.add("active");

      contentSections.forEach((section) => {
        section.classList.remove("active");
        if (section.id === targetId) {
          section.classList.add("active");

          if (targetId === "reviews-section") {
            fetchComments();
          } else if (loadMoreContainer) {
            loadMoreContainer.style.display = "none";
          }
        }
      });
    });
  });

  // Kategoriyalar
  const categoryButtons = document.querySelectorAll(".category-btn");
  const menuCategories = document.querySelectorAll(".menu-category");

  categoryButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const category = this.getAttribute("data-category");

      categoryButtons.forEach((btn) => btn.classList.remove("active"));
      this.classList.add("active");

      if (category === "all") {
        menuCategories.forEach((cat) => (cat.style.display = "block"));
      } else {
        menuCategories.forEach((cat) => {
          if (cat.getAttribute("data-category") === category) {
            cat.style.display = "block";
          } else {
            cat.style.display = "none";
          }
        });
      }
    });
  });

  // Главная bo'limidagi kategoriyalar
  const homeCategories = document.querySelectorAll(".home-category");
  homeCategories.forEach((category) => {
    category.addEventListener("click", function () {
      const categoryType = this.getAttribute("data-category");

      document.querySelector('[data-target="menu-section"]').click();

      setTimeout(() => {
        const categoryBtn = document.querySelector(
          `.category-btn[data-category="${categoryType}"]`
        );
        if (categoryBtn) {
          categoryBtn.click();
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        }
      }, 100);
    });
  });

  // Yangi komment qo'shish - OPTIMALLASHTIRILGAN
  if (reviewForm) {
    reviewForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      // Submit tugmasini disable qilish
      const submitBtn = reviewForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Отправка...";
      submitBtn.disabled = true;

      try {
        // Server holatini tekshirish
        const isServerHealthy = await checkServerHealth();
        if (!isServerHealthy) {
          alert("Сервер не отвечает. Пожалуйста, попробуйте позже.");
          return;
        }

        const name = document.getElementById("name").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const rating = parseInt(document.getElementById("rating").value);
        const comment = document.getElementById("comment").value.trim();
        const subscribed = document.getElementById("subscribed").checked;

        console.log("📝 Forma ma'lumotlari:", {
          name,
          phone,
          rating,
          comment,
          subscribed,
        });

        // Validatsiya
        if (!name || !phone || !rating || !comment) {
          alert("Пожалуйста, заполните все поля");
          return;
        }

        // Telefon raqamini tekshirish
        const phoneRegex = /^\+?[0-9]{10,13}$/;
        const cleanPhone = phone.replace(/\s/g, "");
        if (!phoneRegex.test(cleanPhone)) {
          alert("Пожалуйста, введите правильный номер телефона (10-13 цифр)");
          return;
        }

        if (comment.length < 10) {
          alert("Комментарий должен содержать не менее 10 символов");
          return;
        }

        console.log("📨 Серверга запрос юборилмокда...");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(`${API_BASE_URL}/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            phone: cleanPhone,
            rating,
            comment,
            subscribed,
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log("📨 Жавоб келди:", response.status, response.statusText);

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        if (data.success) {
          // Muvaffaqiyat xabarini ko'rsatish
          if (reviewSuccess) {
            reviewSuccess.textContent = data.message || "Спасибо за ваш отзыв! После модерации он появится на сайте.";
            reviewSuccess.style.display = "block";
          }
          
          reviewForm.reset();
          if (document.getElementById("subscribed")) {
            document.getElementById("subscribed").checked = true;
          }

          // Kommentlarni yangilash
          await fetchComments();

          setTimeout(() => {
            if (reviewSuccess) reviewSuccess.style.display = "none";
          }, 5000);

          console.log("✅ Komment muvaffaqiyatli qo'shildi:", data.comment);
        } else {
          throw new Error(data.error || "Server xatosi");
        }
      } catch (error) {
        console.error("❌ Komment qo'shish xatosi:", error);
        
        let errorMessage = "Ошибка при отправке отзыва: ";
        if (error.name === 'AbortError') {
          errorMessage += "Сервер не отвечает. Попробуйте позже.";
        } else {
          errorMessage += error.message;
        }
        
        alert(errorMessage);
      } finally {
        // Submit tugmasini qayta yoqish
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // Scroll to top
  const scrollTopBtn = document.getElementById("scroll-top");

  if (scrollTopBtn) {
    window.addEventListener("scroll", function () {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      if (scrollTop > 300) {
        scrollTopBtn.classList.add("visible");
      } else {
        scrollTopBtn.classList.remove("visible");
      }
    });

    scrollTopBtn.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }

  // Server holatini dastlabki tekshirish
  setTimeout(() => {
    checkServerHealth();
  }, 2000);
});

// Global error handler
window.addEventListener('error', function(e) {
  console.error('🌍 Global error:', e.error);
});

console.log("✅ main.js yuklandi");