document.addEventListener("DOMContentLoaded", function () {
  // 페이지 로드 시 URL 파라미터 읽기
  const urlParams = new URLSearchParams(window.location.search);
  const placeId = urlParams.get("place_id");
  const placeName = urlParams.get("place_name");
  const userId = urlParams.get("user_id");
  const username = urlParams.get("username");

  console.log("review.js: 페이지 로드됨", {
    placeId,
    placeName,
    userId,
    username,
  });

  // HTML의 hidden input 필드에 값 설정
  const placeIdInput = document.getElementById("place_id");
  const userIdInput = document.getElementById("user_id");
  const usernameInput = document.getElementById("username");
  if (placeIdInput) placeIdInput.value = placeId;
  if (userIdInput) userIdInput.value = userId;
  if (usernameInput) usernameInput.value = username;

  // 페이지 로드 시 해당 장소의 리뷰 불러오기
  loadReviews();
});

// 리뷰 목록 불러오기 (localStorage 사용)
function loadReviews() {
  console.log("review.js: loadReviews() 호출");
  const placeIdElement = document.getElementById("place_id");
  if (!placeIdElement || !placeIdElement.value) {
    console.error("review.js: Place ID를 찾을 수 없습니다.");
    document.getElementById("reviews-list").innerHTML =
      "<p>리뷰를 표시할 장소 정보가 없습니다.</p>";
    return;
  }
  const placeId = placeIdElement.value;
  console.log("review.js: 현재 장소 ID:", placeId);

  const reviewListElement = document.getElementById("reviews-list");
  reviewListElement.innerHTML = "<p>리뷰 로딩 중...</p>";

  // 사용자 ID 가져오기 (리뷰 작성자 비교용)
  const currentUserId = document.getElementById("user_id")?.value;

  let allReviewsAcrossUsers = []; // 모든 사용자의 모든 리뷰를 담을 배열 (개선 필요)

  // localStorage에서 'reviews_'로 시작하는 모든 키를 찾아서 리뷰 로드 (매우 비효율적!)
  // === 중요: 실제 서비스에서는 이 방식 대신 사용자별 키만 로드해야 합니다 ===
  // === 여기서는 DB가 없다는 가정 하에 임시로 모든 리뷰를 읽어 필터링합니다 ===
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("reviews_")) {
        const storedReviews = localStorage.getItem(key);
        if (storedReviews) {
          const userReviews = JSON.parse(storedReviews);
          if (Array.isArray(userReviews)) {
            allReviewsAcrossUsers = allReviewsAcrossUsers.concat(userReviews);
          }
        }
      }
    }
    console.log(
      `review.js: localStorage에서 찾은 총 리뷰 ${allReviewsAcrossUsers.length}개`
    );
  } catch (e) {
    console.error("review.js: localStorage 리뷰 파싱 오류", e);
    reviewListElement.innerHTML =
      "<p style='text-align: center; color: red;'>리뷰 로딩 중 오류 발생</p>";
    return;
  }

  // 현재 장소 ID와 일치하는 리뷰만 필터링
  const placeReviews = allReviewsAcrossUsers.filter(
    (review) => review.place_id === placeId
  );
  console.log(
    `review.js: 현재 장소(${placeId})의 리뷰 ${placeReviews.length}개 필터링 완료`,
    placeReviews
  );

  reviewListElement.innerHTML = ""; // 목록 초기화

  if (placeReviews.length === 0) {
    reviewListElement.innerHTML =
      "<p style='text-align: center; color: #888;'>아직 작성된 리뷰가 없습니다.</p>";
    return;
  }

  // 필터링된 리뷰 목록을 HTML로 생성 (최신순 정렬 추가)
  placeReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // 최신순 정렬

  placeReviews.forEach((review, index) => {
    const reviewItem = document.createElement("div");
    reviewItem.classList.add("review-item");
    const reviewIdentifier = review.id || `temp-${index}-${review.place_id}`;
    reviewItem.dataset.identifier = reviewIdentifier;

    const userName = review.username || "익명";
    const rating = review.rating || 0;
    const comment = review.comment || "";
    const createdAt = review.createdAt
      ? new Date(review.createdAt).toLocaleDateString()
      : "";
    const imageUrl = review.image_url || null;

    reviewItem.innerHTML = `
            <div class="review-header">
                <strong class="username">${escapeHtml(userName)}</strong>
                <span class="rating">${"⭐️".repeat(rating)}${"☆".repeat(
      5 - rating
    )}</span>
                ${
                  createdAt
                    ? `<span class="review-date">${createdAt}</span>`
                    : ""
                }
            </div>
            <p class="comment">${escapeHtml(comment)}</p>
            ${
              imageUrl
                ? `<img src="${escapeHtml(
                    imageUrl
                  )}" alt="리뷰 이미지" class="review-image">`
                : ""
            }
            <!-- 수정/삭제 버튼은 본인 리뷰에만 보이도록 처리 -->
            ${
              review.user_id === currentUserId
                ? `
            <div class="review-actions">
                <button class="small-button" onclick="showEditForm('${escapeHtml(
                  reviewIdentifier
                )}')">수정</button>
                <button class="small-button" onclick="deleteReview('${escapeHtml(
                  reviewIdentifier
                )}', '${review.user_id}')">삭제</button>
            </div>
            `
                : ""
            }
            <hr>
        `;
    reviewListElement.appendChild(reviewItem);
  });
}

// 리뷰 제출 (localStorage 사용)
function submitReview() {
  console.log("review.js: submitReview() 호출");
  const placeId = document.getElementById("place_id")?.value;
  const userId = document.getElementById("user_id")?.value;
  const username = document.getElementById("username")?.value.trim();
  const ratingElement = document.getElementById("rating");
  const rating = ratingElement ? parseInt(ratingElement.value, 10) : 0;
  const commentElement = document.getElementById("comment");
  const comment = commentElement ? commentElement.value.trim() : "";

  // place_name 가져오기 (hidden input 추가 권장)
  const urlParams = new URLSearchParams(window.location.search);
  const placeName = urlParams.get("place_name") || placeId; // URL에서 가져오거나 ID 사용

  if (!placeId || !userId) {
    alert("장소 또는 사용자 정보가 없어 리뷰를 제출할 수 없습니다.");
    console.error("review.js: placeId 또는 userId 누락", { placeId, userId });
    return;
  }
  if (!username) {
    alert("사용자 이름 정보가 없습니다.");
    console.error("review.js: username 누락");
    return;
  }
  if (isNaN(rating) || rating < 1 || rating > 5) {
    alert("별점을 선택해주세요.");
    return;
  }
  if (!comment) {
    alert("리뷰 내용을 입력해주세요.");
    return;
  }

  const newReview = {
    id: `review-${Date.now()}-${userId.slice(-4)}-${placeId.slice(-4)}`, // 더 고유한 ID 생성
    place_id: placeId,
    place_name: placeName,
    user_id: userId,
    username: username,
    rating: rating,
    comment: comment,
    createdAt: new Date().toISOString(),
    // image_url: '...'
  };
  console.log("review.js: 생성된 새 리뷰 객체:", newReview);

  const reviewsKey = `reviews_${userId}`;
  let userReviews = [];
  try {
    const storedReviews = localStorage.getItem(reviewsKey);
    userReviews = storedReviews ? JSON.parse(storedReviews) : [];
    if (!Array.isArray(userReviews)) userReviews = [];
  } catch (e) {
    console.error("review.js: 기존 리뷰 로드/파싱 오류:", e);
    alert("기존 리뷰 로드 중 오류 발생. 저장이 실패할 수 있습니다.");
    userReviews = [];
  }

  userReviews.unshift(newReview); // 새 리뷰 추가

  try {
    localStorage.setItem(reviewsKey, JSON.stringify(userReviews));
    console.log(
      `review.js: localStorage 저장 완료 (Key: ${reviewsKey})`,
      userReviews
    );
    alert("리뷰가 성공적으로 저장되었습니다!");

    if (commentElement) commentElement.value = "";
    if (ratingElement) ratingElement.value = "5";
    loadReviews(); // 목록 새로고침
  } catch (e) {
    console.error("review.js: 리뷰 저장 중 오류 발생:", e);
    alert("리뷰를 저장하는 중 오류가 발생했습니다.");
  }
}

// 수정 폼 보여주기
function showEditForm(identifier) {
  console.log("review.js: showEditForm() 호출", identifier);
  const reviewItem = document.querySelector(
    `.review-item[data-identifier='${identifier}']`
  );
  if (!reviewItem) return;

  const commentP = reviewItem.querySelector(".comment");
  const actionsDiv = reviewItem.querySelector(".review-actions");
  if (!commentP || !actionsDiv) return;

  const originalComment = commentP.textContent;
  reviewItem.dataset.originalComment = originalComment;
  actionsDiv.style.display = "none";

  const editArea = document.createElement("textarea");
  editArea.className = "edit-comment-area";
  editArea.value = originalComment;
  editArea.rows = 3; // 텍스트 영역 크기 지정
  commentP.replaceWith(editArea);

  const buttonGroup = document.createElement("div");
  buttonGroup.className = "edit-buttons";
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "저장";
  saveBtn.className = "small-button save";
  saveBtn.onclick = () => saveEdit(identifier);
  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "취소";
  cancelBtn.className = "small-button cancel";
  cancelBtn.onclick = () => cancelEdit(identifier);

  buttonGroup.appendChild(saveBtn);
  buttonGroup.appendChild(cancelBtn);
  editArea.after(buttonGroup);
}

// 수정 저장 (localStorage 사용)
function saveEdit(identifier) {
  console.log("review.js: saveEdit() 호출", identifier);
  const reviewItem = document.querySelector(
    `.review-item[data-identifier='${identifier}']`
  );
  if (!reviewItem) return;
  const editArea = reviewItem.querySelector(".edit-comment-area");
  if (!editArea) return;
  const newComment = editArea.value.trim();

  if (!newComment) {
    alert("리뷰 내용을 입력해주세요.");
    return;
  }

  try {
    const userId = document.getElementById("user_id")?.value;
    if (!userId) throw new Error("사용자 ID를 찾을 수 없습니다.");
    const reviewsKey = `reviews_${userId}`;
    let reviews = JSON.parse(localStorage.getItem(reviewsKey) || "[]");
    if (!Array.isArray(reviews)) throw new Error("데이터 형식 오류");

    const indexToEdit = reviews.findIndex(
      (review) =>
        (review.id || `temp-${reviews.indexOf(review)}`) === identifier
    );

    if (indexToEdit > -1) {
      reviews[indexToEdit].comment = newComment;
      reviews[indexToEdit].updatedAt = new Date().toISOString();
      localStorage.setItem(reviewsKey, JSON.stringify(reviews));
      console.log(`리뷰 ${identifier} 수정 완료`);
      loadReviews(); // 목록 새로고침
    } else {
      console.warn(`수정할 리뷰 ${identifier}를 찾지 못했습니다.`);
      alert("수정할 리뷰를 찾지 못했습니다.");
      cancelEdit(identifier); // 수정 UI 원복
    }
  } catch (error) {
    console.error("리뷰 수정 중 오류 발생:", error);
    alert("리뷰 수정 중 오류가 발생했습니다.");
  }
}

// 수정 취소
function cancelEdit(identifier) {
  console.log("review.js: cancelEdit() 호출", identifier);
  const reviewItem = document.querySelector(
    `.review-item[data-identifier='${identifier}']`
  );
  if (!reviewItem) return;

  const editArea = reviewItem.querySelector(".edit-comment-area");
  const buttonGroup = reviewItem.querySelector(".edit-buttons");
  const actionsDiv = reviewItem.querySelector(".review-actions");
  const originalComment = reviewItem.dataset.originalComment || "";

  if (editArea) {
    const commentP = document.createElement("p");
    commentP.className = "comment";
    commentP.textContent = originalComment;
    editArea.replaceWith(commentP);
  }
  if (buttonGroup) buttonGroup.remove();
  if (actionsDiv) actionsDiv.style.display = "";

  delete reviewItem.dataset.originalComment;
}

// 리뷰 삭제 (localStorage 사용 - user_id도 인자로 받음)
function deleteReview(identifier, reviewUserId) {
  console.log("review.js: deleteReview() 호출", identifier, reviewUserId);
  const currentUserId = document.getElementById("user_id")?.value;

  // 본인 리뷰인지 확인 (중요!)
  if (currentUserId !== reviewUserId) {
    alert("자신이 작성한 리뷰만 삭제할 수 있습니다.");
    return;
  }

  if (confirm(`이 리뷰를 정말 삭제하시겠습니까?`)) {
    try {
      const reviewsKey = `reviews_${currentUserId}`;
      let reviews = JSON.parse(localStorage.getItem(reviewsKey) || "[]");
      if (!Array.isArray(reviews)) throw new Error("데이터 형식 오류");

      const indexToDelete = reviews.findIndex(
        (review) =>
          (review.id || `temp-${reviews.indexOf(review)}`) === identifier
      );

      if (indexToDelete > -1) {
        reviews.splice(indexToDelete, 1);
        localStorage.setItem(reviewsKey, JSON.stringify(reviews));
        console.log(`리뷰 ${identifier} 삭제 완료`);
        loadReviews(); // 목록 새로고침
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
