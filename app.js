// =================================================================
// 1. 구글 앱스스크립트 배포 URL 설정
// 구글 스프레드시트의 Apps Script를 웹 앱으로 배포한 후 나오는 URL을 아래 따옴표 안에 넣어주세요.
// =================================================================
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxsOu5GDUVyN3YDzsQHiPDPOV2C46C_H02eolw67uM86SloDM5J17qYaIlgxkNA6zG2Og/exec";

const form = document.getElementById("signupForm");
const submitButton = document.getElementById("submitButton");
const btnText = submitButton.querySelector(".btn-text");
const statusMessage = document.getElementById("statusMessage");

// 폼 제출 이벤트 처리
form.addEventListener("submit", async (e) => {
  e.preventDefault(); // 페이지 새로고침 방지

  // 입력된 값 가져오기
  const formData = {
    userName: document.getElementById("userName").value.trim(),
    schoolName: document.getElementById("schoolName").value.trim(),
    phoneNumber: document.getElementById("phoneNumber").value.trim(),
  };

  // URL 미입력 시 친절한 안내
  if (GOOGLE_SCRIPT_URL.includes("여기에_구글")) {
    showStatus(
      "⚠️ 아직 구글 앱스스크립트 URL이 연결되지 않았습니다.<br>app.js 파일 상단의 GOOGLE_SCRIPT_URL을 설정해 주세요.",
      "error"
    );
    return;
  }

  // 버튼 로딩 상태로 변경
  setLoading(true);
  hideStatus();

  try {
    // 구글 앱스스크립트 웹 앱으로 데이터 전송 (POST 요청)
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8", // CORS 방지용 텍스트 형식 전송
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (result.status === "success") {
      // 신청 성공 시 폼 숨기고 축하 메시지 표시
      form.style.display = "none";
      showStatus(
        `🎉 <strong>신청이 정상적으로 완료되었습니다!</strong><br>${result.message}`,
        "success"
      );
    } else if (result.status === "closed") {
      // 정원 마감 시 안내
      form.style.display = "none";
      showStatus(
        `🚫 <strong>선착순 접수가 마감되었습니다.</strong><br>${result.message}`,
        "error"
      );
    } else {
      // 기타 안내
      showStatus(`⚠️ ${result.message || "오류가 발생했습니다."}`, "error");
      setLoading(false);
    }
  } catch (error) {
    console.error("전송 에러:", error);
    showStatus(
      "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      "error"
    );
    setLoading(false);
  }
});

// 버튼 로딩 토글 함수
function setLoading(isLoading) {
  if (isLoading) {
    submitButton.disabled = true;
    submitButton.classList.add("loading");
    btnText.textContent = "신청 접수 중...";
  } else {
    submitButton.disabled = false;
    submitButton.classList.remove("loading");
    btnText.textContent = "신청 완료하기";
  }
}

// 상태 메시지 보여주기 함수
function showStatus(message, type) {
  statusMessage.innerHTML = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = "block";
}

// 상태 메시지 숨기기
function hideStatus() {
  statusMessage.style.display = "none";
}
