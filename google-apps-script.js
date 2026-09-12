// ==========================================
// 1. 선착순 모집 정원 설정
// ==========================================
const MAX_APPLICANTS = 30;

function doPost(e) {
  const lock = LockService.getScriptLock();
  // 동시 접속 시 10초 대기 잠금
  lock.tryLock(10000);

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // 첫 줄 헤더 생성
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["신청일시", "이름", "학교", "전화번호"]);
    }

    const currentCount = Math.max(0, sheet.getLastRow() - 1);

    // [보안 1] 정원 마감 검사
    if (currentCount >= MAX_APPLICANTS) {
      return makeResponse("closed", "모집 정원(" + MAX_APPLICANTS + "명)이 모두 마감되었습니다.");
    }

    // 데이터 읽기
    const data = JSON.parse(e.postData.contents);
    let userName = (data.userName || "").trim();
    let schoolName = (data.schoolName || "").trim();
    let phoneNumber = (data.phoneNumber || "").trim().replace(/[^0-9-]/g, ""); // 숫자와 하이픈만 허용

    // [보안 2] 필수값 및 글자 수 검증 (비정상적으로 긴 스팸 차단)
    if (!userName || !schoolName || !phoneNumber) {
      return makeResponse("error", "모든 항목을 올바르게 입력해 주세요.");
    }
    if (userName.length > 20 || schoolName.length > 30 || phoneNumber.length > 15) {
      return makeResponse("error", "입력 글자 수가 너무 깁니다.");
    }

    // [보안 3] 전화번호 중복 신청 방지
    const existingData = sheet.getDataRange().getValues();
    for (let i = 1; i < existingData.length; i++) {
      const existingPhone = String(existingData[i][3]).trim();
      if (existingPhone === phoneNumber) {
        return makeResponse("error", "이미 해당 전화번호로 신청이 완료된 내역이 있습니다.");
      }
    }

    // [보안 4] 스프레드시트 수식 인젝션 방어 (악성 함수 실행 방지)
    userName = sanitizeForSheet(userName);
    schoolName = sanitizeForSheet(schoolName);
    phoneNumber = sanitizeForSheet(phoneNumber);

    // 구글 시트에 안전하게 기록
    const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
    sheet.appendRow([now, userName, schoolName, phoneNumber]);

    const newCount = currentCount + 1;
    return makeResponse("success", newCount + "번째로 접수되었습니다! (총 정원: " + MAX_APPLICANTS + "명)");

  } catch (error) {
    return makeResponse("error", "서버 오류: " + error.toString());
  } finally {
    lock.releaseLock();
  }
}

// 수식 문자(=, +, -, @)로 시작할 경우 일반 텍스트로 처리하는 안전 함수
function sanitizeForSheet(text) {
  if (typeof text === "string" && /^[=+\-@]/.test(text)) {
    return "'" + text; // 작은따옴표를 앞에 붙여 단순 글자로 취급
  }
  return text;
}

// JSON 응답 생성 헬퍼 함수
function makeResponse(status, message) {
  return ContentService.createTextOutput(JSON.stringify({
    status: status,
    message: message
  })).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService.createTextOutput("정상 동작 중입니다.");
}
