let map;
let currentMarkers = [];
let currentRoute = null;
let currentPosition = null;
let selectedItem = null;
let searchCircle = null;
let ps; // 장소검색 서비스
let lastSearchedPlaces = [];
let kakaoUser = null; // 카카오 로그인 사용자 정보
let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");

// 카카오 SDK 초기화 (YOUR_JAVASCRIPT_KEY를 실제 키로 교체)
window.addEventListener("DOMContentLoaded", () => {
  if (!Kakao.isInitialized()) {
    Kakao.init("YOUR_JAVASCRIPT_KEY");
  }

  // 로그인/로그아웃 버튼 동적 추가
  if (!document.getElementById("kakaoLoginBtn")) {
    const loginBtn = document.createElement("button");
    loginBtn.id = "kakaoLoginBtn";
    loginBtn.textContent = "카카오 로그인";
    loginBtn.onclick = loginWithKakao;
    document.body.insertBefore(loginBtn, document.getElementById("map"));
  }
  if (!document.getElementById("kakaoLogoutBtn")) {
    const logoutBtn = document.createElement("button");
    logoutBtn.id = "kakaoLogoutBtn";
    logoutBtn.textContent = "로그아웃";
    logoutBtn.onclick = kakaoLogout;
    logoutBtn.style.display = "none";
    document.body.insertBefore(logoutBtn, document.getElementById("map"));
  }

  // 즐겨찾기 보기 버튼 동적 추가 (최초 1회만)
  if (!document.getElementById("showFavoritesBtn")) {
    const btn = document.createElement("button");
    btn.id = "showFavoritesBtn";
    btn.textContent = "즐겨찾기 보기";
    btn.onclick = showFavorites;
    document.body.insertBefore(btn, document.getElementById("map"));
  }

  // 로그인 상태 확인
  checkKakaoLoginStatus();
});

function initializeMap() {
  map = new kakao.maps.Map(document.getElementById("map"), {
    center: new kakao.maps.LatLng(37.5665, 126.978),
    level: 5,
  });
  ps = new kakao.maps.services.Places();
}

function goToProfilePage() {
  if (kakaoUser && kakaoUser.kakao_account) {
    // 이미 사용자 정보가 있으면 바로 이동
    window.location.href = "/profile";
  } else if (Kakao.Auth.getAccessToken()) {
    // 토큰은 있으나 사용자 정보가 없는 경우, 사용자 정보 요청 후 이동
    Kakao.API.request({
      url: "/v2/user/me",
      success: function (res) {
        kakaoUser = res;
        window.location.href = "/profile";
      },
      fail: function (error) {
        // 토큰이 만료되었거나 오류면 로그인 모달
        openLoginModal();
      },
    });
  } else {
    // 토큰도 없으면 로그인 모달
    openLoginModal();
  }
}

// 로그인 모달 열고 닫기 (모달 요소는 HTML에 존재해야 함)
function openLoginModal() {
  const modal = document.getElementById("loginModal");
  if (modal) modal.style.display = "flex";
}
function closeLoginModal() {
  const modal = document.getElementById("loginModal");
  if (modal) modal.style.display = "none";
}

// 카카오 로그인 함수 (모달에서도 사용)
function loginWithKakao() {
  Kakao.Auth.login({
    success: function (authObj) {
      Kakao.Auth.setAccessToken(authObj.access_token);
      getUserInfo();
      closeLoginModal();
    },
    fail: function (err) {
      alert("카카오 로그인 실패: " + JSON.stringify(err));
    },
  });
}

// 사용자 정보 요청
function getUserInfo() {
  Kakao.API.request({
    url: "/v2/user/me",
    success: function (res) {
      kakaoUser = res;
      showUserInfo();
      loadFavoritesForUser();
    },
    fail: function (error) {
      alert("사용자 정보 요청 실패: " + JSON.stringify(error));
    },
  });
}

// 로그아웃 함수
function kakaoLogout() {
  Kakao.Auth.logout(function () {
    kakaoUser = null;
    showUserInfo();
    favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
    showPlacesOnMap(lastSearchedPlaces);
  });
}

// 로그인 상태 확인 (새로고침/재접속 시)
function checkKakaoLoginStatus() {
  if (Kakao.Auth.getAccessToken()) {
    getUserInfo();
  } else {
    showUserInfo();
  }
}

// 사용자 정보/로그인 상태 UI 표시
function showUserInfo() {
  const loginBtn = document.getElementById("kakaoLoginBtn");
  const logoutBtn = document.getElementById("kakaoLogoutBtn");
  let userDiv = document.getElementById("kakaoUserInfo");
  if (!userDiv) {
    userDiv = document.createElement("div");
    userDiv.id = "kakaoUserInfo";
    document.body.insertBefore(userDiv, document.getElementById("map"));
  }
  if (kakaoUser && kakaoUser.kakao_account) {
    const nickname = kakaoUser.kakao_account.profile.nickname;
    userDiv.innerHTML = `<b>안녕하세요, ${nickname}님!</b>`;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    userDiv.innerHTML = "";
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
}

// 사용자별 즐겨찾기 로딩/저장 (user id 기준)
function loadFavoritesForUser() {
  if (kakaoUser && kakaoUser.id) {
    const key = "favorites_" + kakaoUser.id;
    favorites = JSON.parse(localStorage.getItem(key) || "[]");
    showPlacesOnMap(lastSearchedPlaces);
  }
}
function saveFavoritesForUser() {
  if (kakaoUser && kakaoUser.id) {
    const key = "favorites_" + kakaoUser.id;
    localStorage.setItem(key, JSON.stringify(favorites));
  } else {
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }
}

// 이하 기존 코드와 동일 (단, 즐겨찾기 저장/불러오기 부분만 위처럼 수정)
function getCurrentLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function (position) {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      currentPosition = new kakao.maps.LatLng(lat, lon);

      map.setCenter(currentPosition);

      const marker = new kakao.maps.Marker({
        map: map,
        position: currentPosition,
        title: "현재 위치",
      });
      const infowindow = new kakao.maps.InfoWindow({
        content: `<div style="padding:5px;white-space:nowrap;">현재 위치</div>`,
      });
      infowindow.open(map, marker);

      showCircleRadius(lat, lon, document.getElementById("radiusSlider").value);
      searchNearby(lat, lon);
    });
  } else {
    alert("이 브라우저에서는 위치 정보를 지원하지 않습니다.");
  }
}

function searchPlaces() {
  const location = document.getElementById("location").value;
  if (!location) {
    alert("위치를 입력하세요.");
    return;
  }
  ps.keywordSearch(location, function (data, status) {
    if (status === kakao.maps.services.Status.OK) {
      const lat = parseFloat(data[0].y);
      const lon = parseFloat(data[0].x);
      currentPosition = new kakao.maps.LatLng(lat, lon);

      map.setCenter(currentPosition);

      const marker = new kakao.maps.Marker({
        map: map,
        position: currentPosition,
        title: "검색한 위치",
      });
      const infowindow = new kakao.maps.InfoWindow({
        content: `<div style="padding:5px;white-space:nowrap;">검색한 위치</div>`,
      });
      infowindow.open(map, marker);

      showCircleRadius(lat, lon, document.getElementById("radiusSlider").value);
      searchNearby(lat, lon);
    } else {
      alert("장소를 찾을 수 없습니다.");
    }
  });
}

function searchNearby(lat, lon) {
  const radius = document.getElementById("radiusSlider").value;
  const category = document.getElementById("categorySelect").value;

  ps.categorySearch(
    category === "all" ? "" : category,
    function (data, status) {
      if (status === kakao.maps.services.Status.OK) {
        const center = new kakao.maps.LatLng(lat, lon);
        const filtered = data.filter((place) => {
          const dist =
            getDistanceFromLatLon(
              lat,
              lon,
              parseFloat(place.y),
              parseFloat(place.x)
            ) * 1000;
          return dist <= radius;
        });
        showPlacesOnMap(filtered);
      } else {
        showPlacesOnMap([]);
      }
    },
    {
      location: new kakao.maps.LatLng(lat, lon),
      radius: radius,
    }
  );
}

function showPlacesOnMap(places) {
  lastSearchedPlaces = places; // 마지막 검색 결과 저장
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  currentMarkers.forEach((markerObj) => {
    markerObj.marker.setMap(null);
    if (markerObj.infowindow) markerObj.infowindow.close();
  });
  currentMarkers = [];

  if (places.length === 0) {
    resultsDiv.innerHTML = "<p>반경 내 검색된 장소가 없습니다.</p>";
    return;
  }

  const countInfo = document.createElement("p");
  countInfo.innerText = `검색 결과: ${places.length}개`;
  resultsDiv.appendChild(countInfo);

  places.forEach((place) => {
    if (place.y && place.x) {
      const name = place.place_name || "이름 없음";
      // 고유 ID 생성 (카카오 place_id가 없으면 좌표로 대체)
      if (!place.id)
        place.id = place.id || place.place_id || `${place.y}_${place.x}`;

      const marker = new kakao.maps.Marker({
        map: map,
        position: new kakao.maps.LatLng(place.y, place.x),
        title: name,
      });

      const infowindow = new kakao.maps.InfoWindow({
        content: `<div style="padding:5px;white-space:nowrap;">${name}</div>`,
      });
      infowindow.open(map, marker);

      currentMarkers.push({ marker, infowindow });

      const item = document.createElement("div");
      item.className = "result-item";
      item.style.cursor = "pointer";

      // 장소 이름을 담을 span 요소 생성
      const nameSpan = document.createElement("span");
      nameSpan.textContent = name;
      item.appendChild(nameSpan);

      // 리뷰 버튼 추가
      const reviewBtn = document.createElement("button");
      reviewBtn.textContent = "리뷰";
      reviewBtn.style.marginLeft = "8px";
      reviewBtn.onclick = (e) => {
        e.stopPropagation(); // 부모의 클릭 이벤트(지도 이동) 방지
        window.location.href = "/review";
      };
      item.appendChild(reviewBtn);

      // ★ 즐겨찾기 버튼 추가
      const favBtn = document.createElement("button");
      favBtn.textContent = "★";
      favBtn.style.color = favorites.find((fav) => fav.id === place.id)
        ? "gold"
        : "gray";
      favBtn.style.marginLeft = "8px";
      favBtn.onclick = (e) => {
        e.stopPropagation();
        toggleFavorite(place);
      };
      item.appendChild(favBtn);

      item.onclick = () => {
        const placeLatLng = new kakao.maps.LatLng(place.y, place.x);

        infowindow.setContent(`<div style="padding:5px;">${name}</div>`);
        infowindow.open(map, marker);

        if (selectedItem) selectedItem.classList.remove("selected");
        item.classList.add("selected");
        selectedItem = item;

        if (currentRoute) {
          currentRoute.setMap(null);
        }

        if (currentPosition) {
          currentRoute = new kakao.maps.Polyline({
            map: map,
            path: [currentPosition, placeLatLng],
            strokeWeight: 4,
            strokeColor: "blue",
            strokeOpacity: 0.7,
          });

          const distance = getDistanceFromLatLon(
            currentPosition.getLat(),
            currentPosition.getLng(),
            parseFloat(place.y),
            parseFloat(place.x)
          );
          const walkingTime = Math.round((distance / 4.8) * 60);

          infowindow.setContent(
            `<div style="padding:5px;">${name}<br>거리: ${distance.toFixed(
              2
            )} km<br>도보: 약 ${walkingTime}분</div>`
          );

          const bounds = new kakao.maps.LatLngBounds();
          bounds.extend(currentPosition);
          bounds.extend(placeLatLng);
          if (searchCircle) {
            bounds.extend(searchCircle.getBounds().getSouthWest());
            bounds.extend(searchCircle.getBounds().getNorthEast());
          }
          map.setBounds(bounds);
        } else {
          map.setCenter(placeLatLng);
          map.setLevel(3);
        }
      };

      resultsDiv.appendChild(item);
    }
  });
}

// 즐겨찾기 추가/삭제 함수
function toggleFavorite(place) {
  if (!place.id) place.id = place.place_id || `${place.y}_${place.x}`;
  const idx = favorites.findIndex((fav) => fav.id === place.id);
  if (idx === -1) {
    favorites.push(place);
  } else {
    favorites.splice(idx, 1);
  }
  saveFavoritesForUser();
  showPlacesOnMap(lastSearchedPlaces);
}

// 즐겨찾기 목록만 보기
function showFavorites() {
  showPlacesOnMap(favorites);
}

function updateRadius() {
  const radius = document.getElementById("radiusSlider").value;
  document.getElementById("radiusValue").innerText = radius + "m";

  if (currentPosition) {
    showCircleRadius(
      currentPosition.getLat(),
      currentPosition.getLng(),
      radius
    );
    searchNearby(currentPosition.getLat(), currentPosition.getLng());
  }
}

function showCircleRadius(lat, lon, radius) {
  if (searchCircle) {
    searchCircle.setMap(null);
  }
  searchCircle = new kakao.maps.Circle({
    center: new kakao.maps.LatLng(lat, lon),
    radius: parseInt(radius),
    strokeWeight: 2,
    strokeColor: "#007BFF",
    strokeOpacity: 1,
    fillColor: "#007BFF",
    fillOpacity: 0.2,
    map: map,
  });

  if (!selectedItem) {
    map.setBounds(searchCircle.getBounds());
  }
}

// 거리 계산 함수 (Haversine 공식)
function getDistanceFromLatLon(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function goToReviewPage() {
  window.location.href = "/review";
}

window.onload = initializeMap;
