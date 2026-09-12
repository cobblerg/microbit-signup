// =================================================================
// 1. 구글 앱스스크립트 배포 URL 설정
// =================================================================
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwNMXRy0dSuMTorohwukDBOZ0yQT3rzSvLkumR7i-Tmk4eKcRh2SEon9E-qfyR4bhS--A/exec";

// 요소 가져오기
const signupForm = document.getElementById("signupForm");
const cancelForm = document.getElementById("cancelForm");
const submitButton = document.getElementById("submitButton");
const cancelButton = document.getElementById("cancelButton");
const statusMessage = document.getElementById("statusMessage");

const tabApply = document.getElementById("tabApply");
const tabCancel = document.getElementById("tabCancel");

// 탭 전환 함수
function switchTab(tab) {
  hideStatus();
  if (tab === "apply") {
    tabApply.classList.add("active");
    tabCancel.classList.remove("active");
    signupForm.style.display = "flex";
    cancelForm.style.display = "none";
  } else {
    tabCancel.classList.add("active");
    tabApply.classList.remove("active");
    signupForm.style.display = "none";
    cancelForm.style.display = "flex";
  }
}

// 1. 참가 신청 폼 제출 처리
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = {
    action: "apply", // 신청 작업
    userName: document.getElementById("userName").value.trim(),
    schoolName: document.getElementById("schoolName").value.trim(),
    phoneNumber: document.getElementById("phoneNumber").value.trim(),
  };

  await sendRequest(formData, signupForm, submitButton, "신청 완료하기", "신청 접수 중...");
});

// 2. 신청 취소 폼 제출 처리
cancelForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = {
    action: "cancel", // 취소 작업
    userName: document.getElementById("cancelUserName").value.trim(),
    phoneNumber: document.getElementById("cancelPhoneNumber").value.trim(),
  };

  if (!confirm(`${formData.userName}님의 신청을 정말 취소하시겠습니까?`)) {
    return;
  }

  await sendRequest(formData, cancelForm, cancelButton, "신청 취소하기", "취소 처리 중...");
});

// 공통 전송 함수
async function sendRequest(payload, targetForm, button, defaultText, loadingText) {
  setButtonLoading(button, true, loadingText);
  hideStatus();

  // 15초 지나면 자동으로 대기를 중단하는 안전장치
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const result = await response.json();

    if (result.status === "success") {
      targetForm.style.display = "none";
      showStatus(
        `🎉 <strong>처리 완료</strong><br>${result.message}`,
        "success"
      );
    } else if (result.status === "closed") {
      targetForm.style.display = "none";
      showStatus(
        `🚫 <strong>선착순 접수 마감</strong><br>${result.message}`,
        "error"
      );
    } else {
      showStatus(`⚠️ ${result.message || "오류가 발생했습니다."}`, "error");
      setButtonLoading(button, false, defaultText);
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("전송 에러:", error);

    if (error.name === "AbortError") {
      showStatus(
        "응답 시간이 초과되었습니다. 구글 시트 배포 상태를 확인해 주세요.",
        "error"
      );
    } else {
      showStatus(
        "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        "error"
      );
    }
    setButtonLoading(button, false, defaultText);
  }
}

// 버튼 로딩 토글 함수
function setButtonLoading(button, isLoading, text) {
  const btnText = button.querySelector(".btn-text");
  if (isLoading) {
    button.disabled = true;
    button.classList.add("loading");
    btnText.textContent = text;
  } else {
    button.disabled = false;
    button.classList.remove("loading");
    btnText.textContent = text;
  }
}

// 상태 메시지 보여주기
function showStatus(message, type) {
  statusMessage.innerHTML = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = "block";
}

// 상태 메시지 숨기기
function hideStatus() {
  statusMessage.style.display = "none";
}
