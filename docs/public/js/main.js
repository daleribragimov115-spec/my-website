// Backend server URL
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3001/api"
    : "/api";

console.log("🚀 API Base URL:", API_BASE_URL);

// Server holatini tekshirish
async function checkServerHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("✅ Server holati:", data);
    return data.success;
  } catch (error) {
    console.error("❌ Serverga ulanib bo'lmadi:", error);
    return false;
  }
}

// Google Translate funktsiyasi
function googleTranslateElementInit() {
  try {
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

  var script = document.createElement("script");
  script.src =
    "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.onerror = function () {
    console.error("❌ Failed to load Google Translate script");
  };
  document.head.appendChild(script);
}

document.addEventListener("DOMContentLoaded", function () {
  // Google Translate ni yuklash
  loadGoogleTranslate();

  // Sharhlarni yuklash va ko'rsatish
  const reviewsList = document.getElementById("reviewsList");
  const loadMoreContainer = document.getElementById("loadMoreContainer");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const reviewForm = document.getElementById("reviewForm");
  const reviewSuccess = document.getElementById("reviewSuccess");

  let visibleCommentsCount = 0;
  const commentsPerPage = 5;
  let allComments = [];

  // Dastlabki kommentlarni yuklash
  fetchComments();

  // Load More tugmasi
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", loadMoreComments);
  }

  // Serverdan kommentlarni olish
  async function fetchComments() {
    try {
      console.log("📨 Kommentlarni olish...");
      const response = await fetch(`${API_BASE_URL}/comments`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Avval response text ni o'qiymiz
      const responseText = await response.text();
      console.log("📨 Server javobi:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("❌ JSON parse xatosi:", parseError);
        throw new Error("Serverdan noto'g'ri javob keldi");
      }

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
                `;
      reviewsList.appendChild(errorMessage);
    }
  }

  // Kommentlarni ekranga chiqarish
  function displayComments(comments) {
    // Avval barcha eski kommentlarni tozalash
    const existingReviews = reviewsList.querySelectorAll(
      ".review-item, .empty-menu-message"
    );
    existingReviews.forEach((item) => item.remove());

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
      loadMoreContainer.style.display = "none";
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

    if (visibleCommentsCount >= comments.length) {
      loadMoreContainer.style.display = "none";
    } else {
      loadMoreContainer.style.display = "block";
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
                    <span class="reviewer-name">${comment.name}</span>
                </div>
                <div class="review-date-container">
                    <span class="review-date">${formattedDate}</span>
                    <span class="review-date-time">${formattedTime}</span>
                </div>
                <div class="review-rating">${stars}</div>
                <p class="review-text ${isLongText ? "fade" : ""}">${
      isLongText ? shortText : comment.comment
    }</p>
                ${
                  isLongText
                    ? '<button class="read-more-btn">Читать полностью</button>'
                    : ""
                }
            `;

    if (isLongText) {
      const readMoreBtn = commentItem.querySelector(".read-more-btn");
      const commentText = commentItem.querySelector(".review-text");

      readMoreBtn.addEventListener("click", function () {
        if (commentText.classList.contains("expanded")) {
          commentText.textContent = shortText;
          commentText.classList.add("fade");
          readMoreBtn.textContent = "Читать полностью";
          commentText.classList.remove("expanded");
        } else {
          commentText.textContent = comment.comment;
          commentText.classList.remove("fade");
          readMoreBtn.textContent = "Свернуть";
          commentText.classList.add("expanded");
        }
      });
    }

    return commentItem;
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
          } else {
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

  // Yangi komment qo'shish - XATOLIKNI TO'G'RILADIGAN VERSIYA
  if (reviewForm) {
    reviewForm.addEventListener("submit", async function (e) {
      e.preventDefault();

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

      try {
        console.log("📨 Серверга запрос юборилмокда...");

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
        });

        console.log("📨 Жавоб келди:", response.status, response.statusText);

        // Response text ni o'qib ko'ramiz
        const responseText = await response.text();
        console.log("📨 Жавоб матни:", responseText);

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("❌ JSON parse xatosi:", parseError);
          throw new Error(
            "Сервердан нотинок жавоб келди: " + responseText.substring(0, 100)
          );
        }

        if (!response.ok) {
          throw new Error(
            data.error || `HTTP error! status: ${response.status}`
          );
        }

        if (data.success) {
          // Muvaffaqiyat xabarini ko'rsatish
          reviewSuccess.textContent =
            data.message ||
            "Спасибо за ваш отзыв! После модерации он появится на сайте.";
          reviewSuccess.style.display = "block";
          reviewForm.reset();
          document.getElementById("subscribed").checked = true;

          // Kommentlarni yangilash
          await fetchComments();

          setTimeout(() => {
            reviewSuccess.style.display = "none";
          }, 5000);

          console.log("✅ Komment muvaffaqiyatli qo'shildi:", data.comment);
        } else {
          throw new Error(data.error || "Server xatosi");
        }
      } catch (error) {
        console.error("❌ Komment qo'shish xatosi:", error);
        alert("Ошибка при отправке отзыва: " + error.message);
      }
    });
  }

  // Scroll to top
  const scrollTopBtn = document.getElementById("scroll-top");

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
});
