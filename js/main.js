              // Backend server URL - using JSON Server for demonstration
      const API_BASE_URL = "http://localhost:3001";

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
              ".notranslate, .review-item, .reviewer-name, .review-text, .review-date, .review-date-time, .item-price"
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
          ".notranslate, .review-item, .reviewer-name, .review-text, .review-date, .review-date-time, .item-price"
        );
        notTranslateElements.forEach((el) => {
          el.classList.add("notranslate");
        });
      }

      document.addEventListener("DOMContentLoaded", function () {
        // Google Translate ni yuklash
        loadGoogleTranslate();

        // Google Translate yuklanganda banner yashirish
        const observer = new MutationObserver(hideGoogleBanner);
        observer.observe(document.body, { childList: true, subtree: true });

        // Sharhlarni bosqichma-bosqich ko'rsatish uchun o'zgaruvchilar
        let visibleReviewsCount = 0;
        const reviewsPerPage = 5;

        // Sharhlarni yuklash va ko'rsatish
        const reviewsList = document.getElementById("reviewsList");
        const loadMoreContainer = document.getElementById("loadMoreContainer");
        const loadMoreBtn = document.getElementById("loadMoreBtn");

        // Modal elementlari
        const deleteModal = document.getElementById("deleteModal");
        const cancelDeleteBtn = document.getElementById("cancelDelete");
        const confirmDeleteBtn = document.getElementById("confirmDelete");
        let reviewToDelete = null;

        // Dastlabki sharhlarni yuklash
        fetchReviews();

        // Load More tugmasi uchun hodisalar
        if (loadMoreBtn) {
          loadMoreBtn.addEventListener("click", loadMoreReviews);
        }

        // Modalni yopish
        cancelDeleteBtn.addEventListener("click", function () {
          deleteModal.style.display = "none";
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
          }
        });

        // Serverdan sharhlarni olish
        async function fetchReviews() {
          try {
            const response = await fetch(`${API_BASE_URL}/reviews`);
            if (!response.ok) throw new Error("Failed to fetch reviews");

            const reviews = await response.json();
            displayReviews(reviews);
          } catch (error) {
            console.error("Error fetching reviews:", error);
            // Fallback to empty reviews list
            displayReviews([]);

            // Show error message
            const errorMessage = document.createElement("div");
            errorMessage.className = "empty-menu-message";
            errorMessage.innerHTML = `
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Не удалось загрузить отзывы. Проверьте подключение к серверу.</p>
                    `;
            reviewsList.appendChild(errorMessage);
          }
        }

        // Sharhlarni ekranga chiqarish
        function displayReviews(reviews) {
          // Avvalgi sharhlarni tozalash
          reviewsList
            .querySelectorAll(".review-item")
            .forEach((item) => item.remove());
          visibleReviewsCount = 0;

          // Agar hech qanday sharh bo'lmasa, xabar ko'rsatish
          if (reviews.length === 0) {
            const noReviews = document.createElement("div");
            noReviews.className = "empty-menu-message";
            noReviews.innerHTML = `
                        <i class="fas fa-comment-slash"></i>
                        <p>Пока нет отзывов. Будьте первым!</p>
                    `;
            reviewsList.appendChild(noReviews);
            loadMoreContainer.style.display = "none";
            return;
          }

          // Sharhlarni ko'rsatish
          loadMoreReviews(reviews);
        }

        // Sharhlarni bosqichma-bosqich yuklash funksiyasi
        function loadMoreReviews(reviews) {
          // Agar reviews parametri berilmagan bo'lsa, hozirgi ko'rsatilayotgan sharhlardan davom etish
          if (!reviews) {
            // Asl sharhlarni serverdan qayta olish kerak
            fetchReviews();
            return;
          }

          const nextReviews = reviews.slice(
            visibleReviewsCount,
            visibleReviewsCount + reviewsPerPage
          );

          nextReviews.forEach((review) => {
            const reviewItem = createReviewElement(review);
            reviewsList.appendChild(reviewItem);
          });

          visibleReviewsCount += nextReviews.length;

          // Agar barcha sharhlar ko'rsatilgan bo'lsa, tugmani yashirish
          if (visibleReviewsCount >= reviews.length) {
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

          reviewItem.innerHTML = `
                    <div class="review-header">
                        <span class="reviewer-name">${review.name}</span>
                    </div>
                    <div class="review-date-container">
                        <span class="review-date">${formattedDate}</span>
                        <span class="review-date-time">${formattedTime}</span>
                    </div>
                    <div class="review-rating">${stars}</div>
                    <p class="review-text ${isLongText ? "fade" : ""}">${
            isLongText ? shortText : review.comment
          }</p>
                    ${
                      isLongText
                        ? '<button class="read-more-btn">Читать полностью</button>'
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

          return reviewItem;
        }

        // Sharhni o'chirish (removed since we don't support deletion from client-side anymore)
        function deleteReview(reviewId) {
          alert("Удаление отзывов недоступно. Обратитесь к администратору.");
        }

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
                  fetchReviews();
                } else {
                  // Boshqa bo'limlarga o'tilganda Load More tugmasini yashirish
                  loadMoreContainer.style.display = "none";
                }
              }
            });
          });
        });

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

        const reviewForm = document.getElementById("reviewForm");
        const reviewSuccess = document.getElementById("reviewSuccess");

        if (reviewForm) {
          reviewForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const name = document.getElementById("name").value;
            const rating = parseInt(document.getElementById("rating").value);
            const comment = document.getElementById("comment").value;

            // Formani to'ldirishni tekshirish
            if (!name || !rating || !comment) {
              alert("Пожалуйста, заполните все поля");
              return;
            }

            try {
              const response = await fetch(`${API_BASE_URL}/reviews`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  name,
                  rating,
                  comment,
                  timestamp: new Date().toISOString(),
                }),
              });

              if (!response.ok) {
                throw new Error("Failed to submit review");
              }

              // Muvaffaqiyat xabarini ko'rsatish
              reviewSuccess.style.display = "block";
              reviewForm.reset();

              // Sharhlarni yangilash
              fetchReviews();

              setTimeout(() => {
                reviewSuccess.style.display = "none";
              }, 5000);
            } catch (error) {
              console.error("Error submitting review:", error);
              alert(
                "Ошибка при отправке отзыва. Проверьте подключение к серверу."
              );
            }
          });
        }

        const scrollTopBtn = document.getElementById("scroll-top");

        window.addEventListener("scroll", function () {
          const scrollTop =
            window.pageYOffset || document.documentElement.scrollTop;

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