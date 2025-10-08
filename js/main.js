// Backend server URL - using JSON Server for demonstration
const API_BASE_URL = "http://localhost:3000";

// Foydalanuvchi identifikatsiyasi uchun
const USER_SESSION_KEY = "sushi_user_session";

// Reviews bilan ishlash classi
class ReviewManager {
  constructor() {
    this.reviews = [];
    this.visibleReviewsCount = 0;
    this.reviewsPerPage = 5;
    this.isOnline = true;
    this.currentUser = this.getCurrentUser();
  }

  // Joriy foydalanuvchini olish
  getCurrentUser() {
    let user = localStorage.getItem(USER_SESSION_KEY);
    if (!user) {
      // Yangi foydalanuvchi yaratish
      user = this.generateUserID();
      localStorage.setItem(USER_SESSION_KEY, user);
    }
    return user;
  }

  // Foydalanuvchi ID yaratish
  generateUserID() {
    return "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  // Foydalanuvchi o'z sharhini tekshirish
  isUserReview(review) {
    return review.userId === this.currentUser;
  }

  // Server mavjudligini tekshirish
  async checkServerStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/reviews`, {
        method: "GET",
        timeout: 5000,
      });
      this.isOnline = response.ok;
      return this.isOnline;
    } catch (error) {
      console.log("Server not available, using localStorage");
      this.isOnline = false;
      return false;
    }
  }

  // Barcha sharhlarni olish
  async fetchReviews() {
    try {
      await this.checkServerStatus();

      if (this.isOnline) {
        const response = await fetch(`${API_BASE_URL}/reviews`);
        if (!response.ok) throw new Error("Failed to fetch reviews");

        this.reviews = await response.json();
        // Serverdan olingan ma'lumotlarni localStorage ga saqlash
        this.saveToStorage();
      } else {
        // LocalStorage dan olish
        this.getReviewsFromStorage();
      }

      // ID bo'yicha tartiblash (eng yangilari birinchi)
      this.reviews.sort(
        (a, b) => new Date(b.timestamp || b.id) - new Date(a.timestamp || a.id)
      );

      return this.reviews;
    } catch (error) {
      console.error("Error fetching reviews:", error);
      return this.getReviewsFromStorage();
    }
  }

  // LocalStorage'dan sharhlarni olish
  getReviewsFromStorage() {
    try {
      const reviews = localStorage.getItem("sushiReviews");
      this.reviews = reviews ? JSON.parse(reviews) : [];
      return this.reviews;
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      this.reviews = [];
      return this.reviews;
    }
  }

  // Yangi sharh qo'shish
  async addReview(reviewData) {
    try {
      // Ma'lumotlarni tozalash
      const cleanReviewData = {
        name: reviewData.name.trim(),
        rating: parseInt(reviewData.rating),
        comment: reviewData.comment.trim(),
        timestamp: new Date().toISOString(),
        userId: this.currentUser, // Foydalanuvchi ID sini qo'shish
      };

      await this.checkServerStatus();

      if (this.isOnline) {
        // Serverga yuborish
        const response = await fetch(`${API_BASE_URL}/reviews`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cleanReviewData),
        });

        if (!response.ok) throw new Error("Failed to submit review");

        const newReview = await response.json();
        this.reviews.unshift(newReview);
      } else {
        // LocalStorage'ga saqlash
        cleanReviewData.id = Date.now();
        this.reviews.unshift(cleanReviewData);
      }

      // Har doim localStorage ga saqlash
      this.saveToStorage();

      return this.reviews[0];
    } catch (error) {
      console.error("Error adding review:", error);
      // LocalStorage'ga saqlash
      reviewData.id = Date.now();
      reviewData.timestamp = new Date().toISOString();
      reviewData.userId = this.currentUser;
      this.reviews.unshift(reviewData);
      this.saveToStorage();
      return this.reviews[0];
    }
  }

  // LocalStorage'ga saqlash
  saveToStorage() {
    try {
      localStorage.setItem("sushiReviews", JSON.stringify(this.reviews));
      return true;
    } catch (error) {
      console.error("Error saving to localStorage:", error);
      return false;
    }
  }

  // Sharhni o'chirish
  async deleteReview(reviewId) {
    try {
      // Foydalanuvchi huquqini tekshirish
      const review = this.reviews.find((r) => r.id == reviewId);
      if (!review) {
        throw new Error("Review not found");
      }

      if (!this.isUserReview(review)) {
        throw new Error("You can only delete your own reviews");
      }

      await this.checkServerStatus();

      if (this.isOnline) {
        // Serverdan o'chirish
        const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, {
          method: "DELETE",
        });

        if (!response.ok) throw new Error("Failed to delete review");
      }

      // Local ro'yxatdan o'chirish
      this.reviews = this.reviews.filter((review) => review.id != reviewId);
      this.saveToStorage();

      return true;
    } catch (error) {
      console.error("Error deleting review:", error);
      throw error; // Xatoni yuqoriga otkazish
    }
  }

  // Ko'rsatilgan sharhlar sonini qaytarish
  getVisibleReviewsCount() {
    return this.visibleReviewsCount;
  }

  // Ko'rsatilgan sharhlar sonini o'rnatish
  setVisibleReviewsCount(count) {
    this.visibleReviewsCount = count;
  }

  // Keyingi sahifadagi sharhlarni olish
  getNextReviews() {
    const startIndex = this.visibleReviewsCount;
    const endIndex = startIndex + this.reviewsPerPage;
    const nextReviews = this.reviews.slice(startIndex, endIndex);
    this.visibleReviewsCount = endIndex;
    return nextReviews;
  }

  // Barcha sharhlar ko'rsatilganligini tekshirish
  hasMoreReviews() {
    return this.visibleReviewsCount < this.reviews.length;
  }

  // Ko'rsatishni qayta boshlash
  resetPagination() {
    this.visibleReviewsCount = 0;
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

    console.log("Google Translate initialized successfully");

    // Tarjima qilinmasligi kerak bo'lgan elementlarni qo'shimcha himoya qilish
    setTimeout(function () {
      const notTranslateElements = document.querySelectorAll(
        ".notranslate, .review-item, .reviewer-name, .review-text, .review-date, .review-date-time, .item-price, .item-title, .item-desc, .category-title, .home-category h3"
      );
      notTranslateElements.forEach((el) => {
        el.classList.add("notranslate");
      });
    }, 1000);
  } catch (error) {
    console.error("Error initializing Google Translate:", error);
    // Fallback: Agar Google Translate yuklanmasa, oddiy til tanlash menyusini ko'rsatish
    document.getElementById("google_translate_element").innerHTML = `
            <div style="padding: 10px;">
                <select id="simpleLanguageSelect" style="padding: 8px; border-radius: 8px; background: rgba(255,255,255,0.2); color: white; border: none;">
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                </select>
            </div>
        `;

    // Oddiy til tanlash funksiyasi
    document
      .getElementById("simpleLanguageSelect")
      .addEventListener("change", function () {
        alert(
          "Til o'zgartirish faqat Google Translate orqali ishlaydi. Iltimos, internet aloqasini tekshiring."
        );
      });
  }
}

// Google Translate scriptini yuklash
function loadGoogleTranslate() {
  if (window.google && window.google.translate) {
    console.log("Google Translate already loaded");
    googleTranslateElementInit();
    return;
  }

  var script = document.createElement("script");
  script.src =
    "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.onerror = function () {
    console.error("Failed to load Google Translate script");
    // Fallback: Agar Google Translate yuklanmasa, oddiy til tanlash menyusini ko'rsatish
    document.getElementById("google_translate_element").innerHTML = `
            <div style="padding: 10px;">
                <select id="simpleLanguageSelect" style="padding: 8px; border-radius: 8px; background: rgba(255,255,255,0.2); color: white; border: none;">
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                </select>
            </div>
        `;

    // Oddiy til tanlash funksiyasi
    document
      .getElementById("simpleLanguageSelect")
      .addEventListener("change", function () {
        alert(
          "Til o'zgartirish faqat Google Translate orqali ishlaydi. Iltimos, internet aloqasini tekshiring."
        );
      });
  };
  document.head.appendChild(script);
}

// Google Translate bannerini yashirish
function hideGoogleBanner() {
  const banner = document.querySelector(".goog-te-banner-frame");
  if (banner) {
    banner.style.display = "none";
  }
  document.body.style.top = "0";

  // Tarjima qilinmasligi kerak bo'lgan elementlarni qo'shimcha himoya qilish
  const notTranslateElements = document.querySelectorAll(
    ".notranslate, .review-item, .reviewer-name, .review-text, .review-date, .review-date-time, .item-price, .item-title, .item-desc, .category-title, .home-category h3"
  );
  notTranslateElements.forEach((el) => {
    el.classList.add("notranslate");
  });
}

// DOM yuklanganda bajariladigan asosiy kod
document.addEventListener("DOMContentLoaded", function () {
  // ReviewManager ni yaratish
  const reviewManager = new ReviewManager();

  // Google Translate ni yuklash
  loadGoogleTranslate();

  // Google Translate yuklanganda banner yashirish
  const observer = new MutationObserver(hideGoogleBanner);
  observer.observe(document.body, { childList: true, subtree: true });

  // Elementlarni olish
  const reviewsList = document.getElementById("reviewsList");
  const loadMoreContainer = document.getElementById("loadMoreContainer");
  const loadMoreBtn = document.getElementById("loadMoreBtn");
  const deleteModal = document.getElementById("deleteModal");
  const cancelDeleteBtn = document.getElementById("cancelDelete");
  const confirmDeleteBtn = document.getElementById("confirmDelete");
  const reviewForm = document.getElementById("reviewForm");
  const reviewSuccess = document.getElementById("reviewSuccess");
  const scrollTopBtn = document.getElementById("scroll-top");

  let reviewToDelete = null;

  // Dastlabki sharhlarni yuklash
  loadReviews();

  // Load More tugmasi uchun hodisalar
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", loadMoreReviews);
  }

  // Modalni yopish
  cancelDeleteBtn.addEventListener("click", function () {
    deleteModal.style.display = "none";
    reviewToDelete = null;
  });

  // O'chirishni tasdiqlash
  confirmDeleteBtn.addEventListener("click", function () {
    if (reviewToDelete) {
      deleteReview(reviewToDelete);
      deleteModal.style.display = "none";
      reviewToDelete = null;
    }
  });

  // Modalni tashqariga bosilganda yopish
  window.addEventListener("click", function (event) {
    if (event.target === deleteModal) {
      deleteModal.style.display = "none";
      reviewToDelete = null;
    }
  });

  // Serverdan sharhlarni olish va ko'rsatish
  async function loadReviews() {
    try {
      await reviewManager.fetchReviews();
      reviewManager.resetPagination();
      displayReviews();
    } catch (error) {
      console.error("Error loading reviews:", error);
      showErrorMessage("Не удалось загрузить отзывы");
    }
  }

  // Sharhlarni ekranga chiqarish
  function displayReviews() {
    // Avvalgi sharhlarni tozalash
    reviewsList
      .querySelectorAll(".review-item")
      .forEach((item) => item.remove());

    // Agar hech qanday sharh bo'lmasa, xabar ko'rsatish
    if (reviewManager.reviews.length === 0) {
      showNoReviewsMessage();
      loadMoreContainer.style.display = "none";
      return;
    }

    // Birinchi sahifadagi sharhlarni ko'rsatish
    loadMoreReviews();
  }

  // Keyingi sahifadagi sharhlarni yuklash
  function loadMoreReviews() {
    const nextReviews = reviewManager.getNextReviews();

    if (nextReviews.length === 0) {
      loadMoreContainer.style.display = "none";
      return;
    }

    nextReviews.forEach((review) => {
      const reviewItem = createReviewElement(review);
      reviewsList.appendChild(reviewItem);
    });

    // Agar barcha sharhlar ko'rsatilgan bo'lsa, tugmani yashirish
    if (!reviewManager.hasMoreReviews()) {
      loadMoreContainer.style.display = "none";
    } else {
      loadMoreContainer.style.display = "block";
    }
  }

  // Sharh elementini yaratish
  function createReviewElement(review) {
    const reviewItem = document.createElement("div");
    reviewItem.className = "review-item notranslate";
    reviewItem.dataset.id = review.id;

    // Yulduzchalarni yaratish
    let stars = "";
    for (let i = 0; i < 5; i++) {
      stars += i < review.rating ? "★" : "☆";
    }

    // Matnning uzunligini tekshirish
    const isLongText = review.comment.length > 200;
    const shortText = isLongText
      ? review.comment.substring(0, 200) + "..."
      : review.comment;

    // To'liq sana va vaqtni formatlash
    const reviewDate = new Date(review.timestamp || review.id);
    const formattedDate = reviewDate.toLocaleDateString("ru-RU");
    const formattedTime = reviewDate.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Foydalanuvchi o'z sharhini tekshirish
    const isOwnReview = reviewManager.isUserReview(review);

    reviewItem.innerHTML = `
            <div class="review-header">
                <span class="reviewer-name">${escapeHtml(review.name)}</span>
                ${
                  isOwnReview
                    ? '<span class="own-review-badge">Ваш отзыв</span>'
                    : ""
                }
            </div>
            <div class="review-date-container">
                <span class="review-date">${formattedDate}</span>
                <span class="review-date-time">${formattedTime}</span>
            </div>
            <div class="review-rating">${stars}</div>
            <p class="review-text ${isLongText ? "fade" : ""}">${escapeHtml(
      isLongText ? shortText : review.comment
    )}</p>
            ${
              isLongText
                ? '<button class="read-more-btn">Читать полностью</button>'
                : ""
            }
            ${
              isOwnReview
                ? `
                <button class="review-delete-btn" title="Удалить отзыв">
                    <i class="fas fa-times"></i>
                </button>
            `
                : ""
            }
        `;

    // "Читать полностью" tugmasi uchun hodisa qo'shish
    if (isLongText) {
      const readMoreBtn = reviewItem.querySelector(".read-more-btn");
      const reviewText = reviewItem.querySelector(".review-text");

      readMoreBtn.addEventListener("click", function () {
        if (reviewText.classList.contains("expanded")) {
          reviewText.textContent = shortText;
          reviewText.classList.add("fade");
          readMoreBtn.textContent = "Читать полностью";
          reviewText.classList.remove("expanded");
        } else {
          reviewText.textContent = review.comment;
          reviewText.classList.remove("fade");
          readMoreBtn.textContent = "Свернуть";
          reviewText.classList.add("expanded");
        }
      });
    }

    // O'chirish tugmasi uchun hodisa qo'shish (faqat o'z sharhlari uchun)
    if (isOwnReview) {
      const deleteBtn = reviewItem.querySelector(".review-delete-btn");
      deleteBtn.addEventListener("click", function () {
        showDeleteConfirmation(review.id);
      });
    }

    return reviewItem;
  }

  // O'chirish tasdiq modali
  function showDeleteConfirmation(reviewId) {
    reviewToDelete = reviewId;
    deleteModal.style.display = "flex";
  }

  // Sharhni o'chirish
  async function deleteReview(reviewId) {
    try {
      await reviewManager.deleteReview(reviewId);

      // DOM dan o'chirish
      const reviewElement = document.querySelector(
        `.review-item[data-id="${reviewId}"]`
      );
      if (reviewElement) {
        reviewElement.remove();
      }

      // Agar barcha sharhlar o'chirilgan bo'lsa
      if (reviewManager.reviews.length === 0) {
        showNoReviewsMessage();
        loadMoreContainer.style.display = "none";
      } else {
        // Pagination ni yangilash
        reviewManager.resetPagination();
        displayReviews();
      }

      showSuccessMessage("Отзыв успешно удален");
    } catch (error) {
      console.error("Error deleting review:", error);
      if (error.message.includes("own reviews")) {
        showErrorMessage("Вы можете удалять только свои отзывы");
      } else {
        showErrorMessage("Ошибка при удалении отзыва");
      }
    }
  }

  // Hech qanday sharh yo'qligi haqida xabar
  function showNoReviewsMessage() {
    const noReviews = document.createElement("div");
    noReviews.className = "empty-menu-message";
    noReviews.innerHTML = `
            <i class="fas fa-comment-slash"></i>
            <p>Пока нет отзывов. Будьте первым!</p>
        `;
    reviewsList.appendChild(noReviews);
  }

  // Xatolik xabarini ko'rsatish
  function showErrorMessage(message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "review-success";
    errorDiv.style.background = "#ff5252";
    errorDiv.textContent = message;
    errorDiv.style.display = "block";

    reviewsList.insertBefore(errorDiv, reviewsList.firstChild);

    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  // Muvaffaqiyat xabarini ko'rsatish
  function showSuccessMessage(message) {
    const successDiv = document.createElement("div");
    successDiv.className = "review-success";
    successDiv.textContent = message;
    successDiv.style.display = "block";

    reviewsList.insertBefore(successDiv, reviewsList.firstChild);

    setTimeout(() => {
      successDiv.remove();
    }, 5000);
  }

  // HTML escape qilish
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Form submit hodisasi
  if (reviewForm) {
    reviewForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const name = document.getElementById("name").value.trim();
      const rating = parseInt(document.getElementById("rating").value);
      const comment = document.getElementById("comment").value.trim();

      // Formani to'ldirishni tekshirish
      if (!name || !rating || !comment) {
        showErrorMessage("Пожалуйста, заполните все поля");
        return;
      }

      if (comment.length < 10) {
        showErrorMessage("Отзыв должен содержать не менее 10 символов");
        return;
      }

      try {
        const reviewData = { name, rating, comment };
        await reviewManager.addReview(reviewData);

        // Muvaffaqiyat xabarini ko'rsatish
        reviewSuccess.style.display = "block";
        reviewForm.reset();

        // Sharhlarni yangilash
        reviewManager.resetPagination();
        displayReviews();

        setTimeout(() => {
          reviewSuccess.style.display = "none";
        }, 5000);
      } catch (error) {
        console.error("Error submitting review:", error);
        showErrorMessage("Ошибка при отправке отзыва");
      }
    });
  }

  // Navigatsiya va boshqa funksiyalar...
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

          // Agar bu "Отзывы" bo'limi bo'lsa, sharhlarni yangilash
          if (targetId === "reviews-section") {
            loadReviews();
          } else {
            // Boshqa bo'limlarga o'tilganda Load More tugmasini yashirish
            loadMoreContainer.style.display = "none";
          }
        }
      });
    });
  });

  // Scroll to top funksiyasi
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
