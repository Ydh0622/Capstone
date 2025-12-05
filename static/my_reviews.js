document.addEventListener("DOMContentLoaded", function () {
  console.log("my_reviews.js (localStorage): DOMContentLoaded 이벤트 발생"); // <--- 이 로그가 찍히나요?

  let kakaoUser;
  try {
    const userData = localStorage.getItem("kakao_user");
    kakaoUser = userData ? JSON.parse(userData) : null;
    if (kakaoUser)
      console.log(
        "my_reviews.js (localStorage): 사용자 정보 로드:",
        kakaoUser
      ); // <--- 사용자 정보가 제대로 나오나요? (ID 포함)
    else console.log("my_reviews.js (localStorage): 사용자 정보 없음");
  } catch (e) {
    console.error("my_reviews.js (localStorage): 사용자 정보 파싱 오류", e);
    kakaoUser = null;
  }

  const listElement = document.getElementById("my-reviews-list");

  // 로그인 상태 확인
  if (!kakaoUser || !kakaoUser.id) {
    console.log("my_reviews.js (localStorage): 로그인 필요 상태"); // <--- 이 로그가 찍히나요?
    listElement.innerHTML =
      "<p style='text-align: center; color: #888;'>로그인이 필요합니다.</p>";
    return;
  }

  const userId = kakaoUser.id;
  const reviewsKey = `reviews_${userId}`; // 사용자 ID 기반 키
  console.log(
    `my_reviews.js (localStorage): localStorage 로드 시도 (Key: ${reviewsKey})`
  ); // <--- 올바른 키 이름이 나오나요?

  let reviews = [];
  try {
    const storedReviews = localStorage.getItem(reviewsKey);
    reviews = storedReviews ? JSON.parse(storedReviews) : [];
    if (!Array.isArray(reviews)) {
      // 혹시 잘못된 데이터가 저장된 경우 대비
      console.warn(
        "my_reviews.js (localStorage): 저장된 데이터가 배열이 아님. 초기화.",
        reviews
      );
      reviews = [];
    }
    // ▼▼▼ 이 로그가 가장 중요합니다! ▼▼▼
    console.log(
      `my_reviews.js (localStorage): 로드된 리뷰 데이터 (${reviews.length}개):`,
      reviews
    ); // <--- 여기에 리뷰 데이터가 배열 형태로 들어있나요? 아니면 [] 인가요?
  } catch (e) {
    console.error("my_reviews.js (localStorage): 리뷰 데이터 파싱 오류", e); // <--- 혹시 이 오류가 발생하나요?
    listElement.innerHTML =
      "<p style='text-align: center; color: red;'>리뷰 데이터를 불러오는 중 오류가 발생했습니다.</p>";
    return;
  }

  // 리뷰 목록 표시
  if (reviews.length === 0) {
    console.log("my_reviews.js (localStorage): 작성된 리뷰 없음"); // <--- 데이터가 없다면 이 로그가 찍힙니다.
    listElement.innerHTML =
      "<p style='text-align: center; color: #888;'>작성한 리뷰가 없습니다.</p>";
    return;
  }

  // 리뷰 목록 HTML 생성 (최신순 정렬 추가)
  reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  let html = "<ul class='review-list'>";
  reviews.forEach((review, index) => {
    const placeName = review.place_name || review.place_id || "알 수 없는 장소";
    const rating = review.rating || 0;
    const comment = review.comment || "";
    const imageUrl = review.image_url || null;
    const createdAt = review.createdAt
      ? new Date(review.createdAt).toLocaleDateString()
      : "";
    const reviewIdentifier = review.id || `temp-${index}`; // 임시 ID 사용 시 주의

    html += `
            <li class="review-item" data-identifier="${escapeHtml(
              reviewIdentifier
            )}">
                <div class="review-header">
                    <strong class="place-name">${escapeHtml(placeName)}</strong>
                    <span class="rating">${"⭐️".repeat(rating)}${"☆".repeat(
      5 - rating
    )}</span>
                </div>
                <p class="comment">${escapeHtml(comment)}</p>
                ${
                  imageUrl
                    ? `<img src="${escapeHtml(
                        imageUrl
                      )}" alt="리뷰 이미지" class="review-image">`
                    : ""
                }
                ${
                  createdAt
                    ? `<span class="review-date">작성일: ${createdAt}</span>`
                    : ""
                }
                <div class="review-actions">
                     <button onclick="editReview('${escapeHtml(
                       reviewIdentifier
                     )}')">수정</button>
                     <button onclick="deleteReview('${escapeHtml(
                       reviewIdentifier
                     )}')">삭제</button>
                </div>
            </li>`;
  });
  html += "</ul>";

  listElement.innerHTML = html;
  console.log("my_reviews.js (localStorage): 리뷰 목록 표시 완료"); // <--- 여기까지 실행되면 화면에 보여야 합니다.
});

// HTML 특수 문자 이스케이프 함수
function escapeHtml(unsafe) {
  if (typeof unsafe !== "string") return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- 리뷰 수정 및 삭제 함수 (localStorage 버전) ---
function editReview(identifier) {
  console.log("Edit review:", identifier);
  alert(`리뷰 수정 기능 (localStorage)은 아직 구현되지 않았습니다.`);
  // TODO: localStorage에서 해당 identifier를 가진 리뷰 찾아 수정 기능 구현
}

function deleteReview(identifier) {
  console.log("Delete review:", identifier);
  if (confirm(`이 리뷰를 정말 삭제하시겠습니까?`)) {
    try {
      const userId = JSON.parse(localStorage.getItem("kakao_user"))?.id;
      if (!userId) throw new Error("사용자 ID를 찾을 수 없습니다.");

      const reviewsKey = `reviews_${userId}`;
      let reviews = JSON.parse(localStorage.getItem(reviewsKey) || "[]");
      if (!Array.isArray(reviews))
        throw new Error("저장된 리뷰 데이터 형식이 잘못되었습니다.");

      // review.id 또는 임시 ID ('temp-' + index) 를 비교하여 인덱스 찾기
      const indexToDelete = reviews.findIndex(
        (review, index) => (review.id || `temp-${index}`) === identifier
      );

      if (indexToDelete > -1) {
        reviews.splice(indexToDelete, 1); // 배열에서 제거
        localStorage.setItem(reviewsKey, JSON.stringify(reviews)); // 변경된 배열 저장
        console.log(`리뷰 ${identifier} 삭제 완료`);
        location.reload(); // 페이지 새로고침하여 변경사항 반영
      } else {
        console.warn(`삭제할 리뷰 ${identifier}를 찾지 못했습니다.`);
        alert("삭제할 리뷰를 찾지 못했습니다.");
      }
    } catch (error) {
      console.error("리뷰 삭제 중 오류 발생:", error);
      alert("리뷰 삭제 중 오류가 발생했습니다.");
    }
  }
}
